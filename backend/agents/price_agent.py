from backend.agents.base import call_agent
from backend.models.agent_types import AgentResult

SYSTEM = """You are a Price Analysis Agent. Score 0-10: 10 = exceptional value, 0 = price gouging relative to spec tier.
Flag if price is more than 30% above closest competitor for equivalent specs.
Return evidence as specific price comparisons.
Use ONLY the provided product data."""


async def run_price_agent(product: dict, user_query: str) -> AgentResult:
    return await call_agent("price", SYSTEM, user_query, product)
