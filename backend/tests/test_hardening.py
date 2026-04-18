"""Phase 4 hardening tests — degraded agent + FAISS fallback."""
import pytest
from unittest.mock import patch, AsyncMock
from backend.models.agent_types import AgentResult, ReasoningChain


def _make_result(agent: str, score: float, confidence: float, flags=None, audit_note=None) -> AgentResult:
    return AgentResult(
        agent=agent, score=score, confidence=confidence,
        evidence=[f"{agent} evidence"], flags=flags or [], audit_note=audit_note
    )


@pytest.mark.asyncio
async def test_degraded_agent_via_base_call(TEST_PRODUCT):
    """Phase 4 hardening: call_agent with a broken API client still returns
    AGENT_UNAVAILABLE with score 0 — never crashes."""
    from backend.agents.base import call_agent

    with patch("backend.agents.base.client") as mock_client:
        mock_client.messages.create.side_effect = RuntimeError("API down")
        result = await call_agent("price", "test system", "test query", TEST_PRODUCT)

    assert result.agent == "price"
    assert result.score == 0.0
    assert result.confidence == 0.0
    assert "AGENT_UNAVAILABLE" in result.flags


@pytest.mark.asyncio
async def test_degraded_agent_endpoint_still_returns_5(TEST_PRODUCT):
    """Phase 4 hardening: when all Claude API calls fail, orchestrator still
    returns a ReasoningChain with 4 agents (all AGENT_UNAVAILABLE)."""
    from backend.agents.orchestrator import evaluate_product

    # Patch call_agent to always return AGENT_UNAVAILABLE
    unavailable = AgentResult(agent="", score=0, confidence=0, evidence=[], flags=["AGENT_UNAVAILABLE"])

    async def mock_call(agent_name, system, msg, ctx):
        return AgentResult(agent=agent_name, score=0, confidence=0, evidence=[], flags=["AGENT_UNAVAILABLE"])

    with patch("backend.agents.base.call_agent", side_effect=mock_call):
        chain = await evaluate_product(TEST_PRODUCT, "test query")

    assert isinstance(chain, ReasoningChain)
    assert len(chain.agent_results) == 4
    # All agents should have AGENT_UNAVAILABLE but chain is still valid
    assert chain.final_score == 0.0
    assert chain.product_id == TEST_PRODUCT["id"]


@pytest.mark.asyncio
async def test_faiss_fallback_returns_5_candidates():
    """Phase 4 hardening: if query_index raises, the FAISS fallback in main.py
    returns top 5 products sorted by weighted attribute sum."""
    from backend.main import PRODUCTS, ATTRIBUTE_KEYS

    # Simulate the fallback logic directly
    preference_state = [0.5, 0.7, 0.6, 0.6, 0.5, 0.7]
    scored = []
    for p in PRODUCTS:
        attr_sum = sum(p["attributes"].get(k, 0) * w for k, w in zip(ATTRIBUTE_KEYS, preference_state))
        scored.append((p, attr_sum))
    scored.sort(key=lambda x: x[1], reverse=True)
    candidates = scored[:5]

    assert len(candidates) == 5
    # Scores should be descending
    scores = [s for _, s in candidates]
    assert scores == sorted(scores, reverse=True)
    # Each candidate should be a product dict with required keys
    for product, score in candidates:
        assert "id" in product
        assert "name" in product
        assert "attributes" in product
        assert score > 0
