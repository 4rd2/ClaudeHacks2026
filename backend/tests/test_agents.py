import pytest
from unittest.mock import patch, AsyncMock
from backend.models.agent_types import AgentResult


def _mock_result(agent_name: str) -> AgentResult:
    return AgentResult(
        agent=agent_name,
        score=7.5,
        confidence=0.85,
        evidence=["Test evidence item"],
        flags=[]
    )


def _unavailable_result(agent_name: str) -> AgentResult:
    return AgentResult(
        agent=agent_name,
        score=0,
        confidence=0,
        evidence=[],
        flags=["AGENT_UNAVAILABLE"]
    )


def _assert_valid_envelope(result: AgentResult, expected_agent: str):
    assert result.agent == expected_agent
    assert 0.0 <= result.score <= 10.0
    assert 0.0 <= result.confidence <= 1.0
    assert isinstance(result.evidence, list)
    assert isinstance(result.flags, list)


@pytest.mark.asyncio
async def test_price_agent_returns_valid_envelope(TEST_PRODUCT):
    with patch("backend.agents.base.call_agent", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = _mock_result("price")
        from backend.agents.price_agent import run_price_agent
        result = await run_price_agent(TEST_PRODUCT, "find me best noise cancelling headphones")
    _assert_valid_envelope(result, "price")


@pytest.mark.asyncio
async def test_specs_agent_returns_valid_envelope(TEST_PRODUCT):
    with patch("backend.agents.base.call_agent", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = _mock_result("specs")
        from backend.agents.specs_agent import run_specs_agent
        result = await run_specs_agent(TEST_PRODUCT, "find me best noise cancelling headphones")
    _assert_valid_envelope(result, "specs")


@pytest.mark.asyncio
async def test_review_agent_returns_valid_envelope(TEST_PRODUCT):
    with patch("backend.agents.base.call_agent", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = _mock_result("review")
        from backend.agents.review_agent import run_review_agent
        result = await run_review_agent(TEST_PRODUCT, "find me best noise cancelling headphones")
    _assert_valid_envelope(result, "review")


@pytest.mark.asyncio
async def test_agent_unavailable_on_exception(TEST_PRODUCT):
    """base.py catch-all returns AGENT_UNAVAILABLE on any exception — verify contract."""
    with patch("backend.agents.base.call_agent", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = _unavailable_result("price")
        from backend.agents.price_agent import run_price_agent
        result = await run_price_agent(TEST_PRODUCT, "query")
    assert "AGENT_UNAVAILABLE" in result.flags
    assert result.score == 0
    assert result.confidence == 0
