from backend.agents.base import call_agent

SYSTEM = """You are a Review Analysis Agent. Score 0-10 based on:
sentiment_score (60% weight) and top complaints severity (40% weight).
Flag if any complaint pattern appears in more than 15% of signals.
Do NOT factor in specs or price. Use ONLY the provided product data."""

async def run_review_agent(product, user_query):
    return await call_agent("review", SYSTEM, user_query, product)
