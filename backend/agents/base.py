import anthropic
import asyncio
import json
from backend.models.agent_types import AgentResult

client = anthropic.Anthropic()

AGENT_TIMEOUT = 10  # seconds


async def call_agent(agent_name: str, system_prompt: str, user_message: str, product_context: dict) -> AgentResult:
    try:
        loop = asyncio.get_event_loop()
        response = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1000,
                    system=system_prompt + "\n\nRespond ONLY with valid JSON: {score, confidence, evidence, flags}. No preamble.",
                    messages=[{
                        "role": "user",
                        "content": f"Product: {json.dumps(product_context)}\n\nUser query: {user_message}"
                    }]
                )
            ),
            timeout=AGENT_TIMEOUT
        )
        data = json.loads(response.content[0].text)
        data["agent"] = agent_name
        return AgentResult(**data)
    except Exception:
        return AgentResult(agent=agent_name, score=0, confidence=0, evidence=[], flags=["AGENT_UNAVAILABLE"])
