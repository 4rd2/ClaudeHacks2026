from backend.models.agent_types import AgentResult
from backend.agents.base import call_agent

ADVERSARIAL_SYSTEM = """You are an adversarial auditor. Your ONLY job is to find a disqualifying reason NOT to recommend this product.
Score 10 = strong disqualifying evidence found. Score 0 = genuinely could not find any.
A failed attack (score < 4) is a positive trust signal — report it honestly.
Use ONLY the provided product data."""


async def run_bias_detector(product, user_query):
    flags: list[str] = []
    evidence: list[str] = []

    rd = product["review_data"]

    star_normalized = rd["aggregate_score"] / 5.0
    sentiment = rd["sentiment_score"]
    if star_normalized > 0.84 and sentiment < 0.65:
        flags.append(
            f"SCORE_SENTIMENT_DIVERGENCE: {rd['aggregate_score']} stars but sentiment {sentiment:.2f}"
        )
        evidence.append(
            f"Rating {rd['aggregate_score']}/5 contradicted by NLP sentiment {sentiment:.2f}"
        )

    source_dist = rd["source_distribution"]
    max_source = max(source_dist, key=source_dist.get)
    if source_dist[max_source] > 0.55:
        pct = source_dist[max_source] * 100
        flags.append(f"SOURCE_CONCENTRATION: {max_source} = {pct:.0f}% of reviews")
        evidence.append(f"{pct:.0f}% of reviews from single source ({max_source})")

    try:
        llm = await call_agent("bias_detector_llm", ADVERSARIAL_SYSTEM, user_query, product)
        attack_succeeded = llm.score > 6
        first_finding = llm.evidence[0] if llm.evidence else "no disqualifying evidence found"
        return AgentResult(
            agent="bias_detector",
            score=llm.score,
            confidence=llm.confidence,
            evidence=evidence + llm.evidence,
            flags=flags + llm.flags,
            audit_note=f"Adversarial attack {'succeeded' if attack_succeeded else 'failed'} — {first_finding}",
        )
    except Exception:
        return AgentResult(
            agent="bias_detector",
            score=0,
            confidence=0,
            evidence=evidence,
            flags=flags + ["AGENT_UNAVAILABLE"],
            audit_note="Adversarial auditor unavailable; rule-based flags only",
        )
