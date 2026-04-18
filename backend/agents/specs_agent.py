from backend.agents.base import call_agent
from backend.models.agent_types import AgentResult

SYSTEM = """You are a Technical Specifications Agent. Score 0-10 on measurable specs only:
ANC performance, battery life, codec support, driver quality, build quality.
Do NOT factor in price or reviews.
Flag if any spec is below category average for the price tier.
Use ONLY the provided product data."""


async def run_specs_agent(product: dict, user_query: str) -> AgentResult:
    return await call_agent("specs", SYSTEM, user_query, product)
