from backend.agents.base import call_agent

SYSTEM = """You are a Price Analysis Agent. Score 0-10: 10 = exceptional value, 0 = price gouging.
Flag if price is more than 30% above closest competitor for equivalent specs.
Use ONLY the provided product data. Return evidence as specific price comparisons."""

async def run_price_agent(product, user_query):
    return await call_agent("price", SYSTEM, user_query, product)
