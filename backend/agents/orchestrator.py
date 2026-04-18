import asyncio
from backend.models.agent_types import ConflictReport, ReasoningChain
from backend.agents.price_agent import run_price_agent
from backend.agents.specs_agent import run_specs_agent
from backend.agents.review_agent import run_review_agent

CONFLICT_THRESHOLD = 2.5


def detect_conflict(results):
    scored = [r for r in results if r.agent != "bias_detector"]
    scores = [r.score for r in scored]
    spread = max(scores) - min(scores)
    if spread > CONFLICT_THRESHOLD:
        desc = " vs ".join([
            f"{r.agent} ({r.score:.1f})"
            for r in sorted(scored, key=lambda x: x.score, reverse=True)
        ])
        return ConflictReport(
            exists=True, max_spread=spread,
            conflicting_agents=[r.agent for r in scored],
            description=desc
        )
    return ConflictReport(exists=False, max_spread=spread, conflicting_agents=[], description="Agents in agreement.")


async def evaluate_product(product: dict, user_query: str) -> ReasoningChain:
    # Import here to avoid circular import — bias_detector.py is owned by Person B
    try:
        from backend.agents.bias_detector import run_bias_detector
    except ImportError:
        from backend.models.agent_types import AgentResult
        async def run_bias_detector(p, q):
            return AgentResult(agent="bias_detector", score=0, confidence=0, evidence=[], flags=["AGENT_UNAVAILABLE"])

    results = list(await asyncio.gather(
        run_price_agent(product, user_query),
        run_specs_agent(product, user_query),
        run_review_agent(product, user_query),
        run_bias_detector(product, user_query)
    ))

    conflict = detect_conflict(results)
    bias = next(r for r in results if r.agent == "bias_detector")
    audit_passed = len(bias.flags) == 0 or bias.score < 6

    core = [r for r in results if r.agent != "bias_detector"]
    if all(r.score > 8.5 for r in core) and not bias.flags:
        bias.flags.append("CLEAN_SWEEP_ANOMALY: all agents scored above 8.5 with no flags")
        audit_passed = False

    total_confidence = sum(r.confidence for r in core)
    final_score = sum(r.score * r.confidence for r in core) / total_confidence if total_confidence > 0 else 0.0

    return ReasoningChain(
        product_id=product["id"],
        product_name=product["name"],
        agent_results=results,
        conflict_report=conflict,
        audit_passed=audit_passed,
        audit_attempts=[bias.audit_note or ""],
        final_score=final_score,
        recommendation_rank=0
    )
