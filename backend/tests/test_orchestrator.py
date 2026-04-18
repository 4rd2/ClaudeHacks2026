import pytest
import sys
from types import ModuleType
from unittest.mock import patch, AsyncMock
from backend.models.agent_types import AgentResult, ReasoningChain


def _make_result(agent: str, score: float, confidence: float, flags=None, audit_note=None) -> AgentResult:
    return AgentResult(
        agent=agent,
        score=score,
        confidence=confidence,
        evidence=[f"{agent} evidence"],
        flags=flags or [],
        audit_note=audit_note
    )


def _make_bias_module(score, conf, flags=None, audit_note=None):
    mod = ModuleType("backend.agents.bias_detector")

    async def run_bias_detector(p, q):
        return _make_result("bias_detector", score, conf, flags=flags or [], audit_note=audit_note)

    mod.run_bias_detector = run_bias_detector
    return mod


async def _evaluate(product, query="test query",
                    price_score=7.0, price_conf=0.85,
                    specs_score=7.0, specs_conf=0.85,
                    review_score=7.0, review_conf=0.85,
                    bias_score=2.0, bias_conf=0.9,
                    bias_flags=None, bias_note=None):
    """Helper: patch all agents and call evaluate_product."""
    from backend.agents import orchestrator

    bias_mod = _make_bias_module(bias_score, bias_conf, bias_flags, bias_note)
    with patch("backend.agents.orchestrator.run_price_agent",
               new_callable=AsyncMock,
               return_value=_make_result("price", price_score, price_conf)), \
         patch("backend.agents.orchestrator.run_specs_agent",
               new_callable=AsyncMock,
               return_value=_make_result("specs", specs_score, specs_conf)), \
         patch("backend.agents.orchestrator.run_review_agent",
               new_callable=AsyncMock,
               return_value=_make_result("review", review_score, review_conf)), \
         patch.dict(sys.modules, {"backend.agents.bias_detector": bias_mod}):
        return await orchestrator.evaluate_product(product, query)


@pytest.mark.asyncio
async def test_parallel_execution(TEST_PRODUCT):
    """AGENTS-01: evaluate_product returns ReasoningChain with all 4 agent envelopes."""
    chain = await _evaluate(TEST_PRODUCT)
    assert isinstance(chain, ReasoningChain)
    assert len(chain.agent_results) == 4
    agent_names = {r.agent for r in chain.agent_results}
    assert agent_names == {"price", "specs", "review", "bias_detector"}


@pytest.mark.asyncio
async def test_conflict_detection_triggers(TEST_PRODUCT):
    """CONFLICT-01, CONFLICT-02: spread > 2.5 triggers ConflictReport with side-by-side attribution."""
    chain = await _evaluate(TEST_PRODUCT, price_score=9.0, specs_score=8.0, review_score=5.0)
    assert chain.conflict_report.exists is True
    assert chain.conflict_report.max_spread == pytest.approx(4.0)
    # description must show agent names side-by-side — not blended
    assert "price" in chain.conflict_report.description
    assert "review" in chain.conflict_report.description
    assert " vs " in chain.conflict_report.description


@pytest.mark.asyncio
async def test_no_conflict_below_threshold(TEST_PRODUCT):
    """CONFLICT-01: spread <= 2.5 means no conflict."""
    chain = await _evaluate(TEST_PRODUCT, price_score=7.0, specs_score=7.0, review_score=7.0)
    assert chain.conflict_report.exists is False
    assert chain.conflict_report.description == "Agents in agreement."


@pytest.mark.asyncio
async def test_clean_sweep_anomaly(TEST_PRODUCT):
    """CONFLICT-03: all scoring agents > 8.5 with no bias flags → CLEAN_SWEEP_ANOMALY + audit_passed=False."""
    chain = await _evaluate(
        TEST_PRODUCT,
        price_score=9.0, price_conf=0.9,
        specs_score=9.1, specs_conf=0.9,
        review_score=9.2, review_conf=0.9,
        bias_score=0.0, bias_conf=0.0, bias_flags=[]
    )
    bias_result = next(r for r in chain.agent_results if r.agent == "bias_detector")
    assert any("CLEAN_SWEEP_ANOMALY" in f for f in bias_result.flags)
    assert chain.audit_passed is False


@pytest.mark.asyncio
async def test_audit_passed_logic(TEST_PRODUCT):
    """AUDIT-02: audit_passed = (no flags) OR (bias.score < 6). AUDIT-03: score < 4 surfaced in audit_attempts."""
    # Case A: score >= 6 AND flags → audit fails
    chain_a = await _evaluate(TEST_PRODUCT, bias_score=7.0, bias_flags=["SOME_FLAG"])
    assert chain_a.audit_passed is False

    # Case B: score < 6, even with flags → audit passes (score < 6 overrides)
    chain_b = await _evaluate(TEST_PRODUCT, bias_score=3.0, bias_flags=["SOME_FLAG"],
                               bias_note="Adversarial attack failed — no disqualifying evidence found")
    assert chain_b.audit_passed is True
    # AUDIT-03: failed attack (score < 4) is surfaced in audit_attempts
    assert len(chain_b.audit_attempts) > 0

    # Case C: no flags, any score → audit passes
    chain_c = await _evaluate(TEST_PRODUCT, bias_score=7.0, bias_flags=[])
    assert chain_c.audit_passed is True


@pytest.mark.asyncio
async def test_confidence_weighted_final_score(TEST_PRODUCT):
    """CONFLICT-04: final_score is confidence-weighted average of 3 scoring agents only."""
    chain = await _evaluate(
        TEST_PRODUCT,
        price_score=8.0, price_conf=0.9,
        specs_score=6.0, specs_conf=0.6,
        review_score=7.0, review_conf=0.75
    )
    expected = (8.0 * 0.9 + 6.0 * 0.6 + 7.0 * 0.75) / (0.9 + 0.6 + 0.75)
    assert chain.final_score == pytest.approx(expected, rel=1e-3)


@pytest.mark.asyncio
async def test_zero_confidence_guard(TEST_PRODUCT):
    """AGENTS-07: all agents fail (confidence=0) → final_score=0.0, no ZeroDivisionError."""
    chain = await _evaluate(
        TEST_PRODUCT,
        price_score=0.0, price_conf=0.0,
        specs_score=0.0, specs_conf=0.0,
        review_score=0.0, review_conf=0.0
    )
    assert chain.final_score == 0.0
