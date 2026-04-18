import json
import anthropic

ATTRIBUTE_KEYS = [
    "price_sensitivity",
    "sound_quality",
    "comfort",
    "battery_life",
    "portability",
    "noise_cancellation",
]

DEFAULT_PREFERENCE_VECTOR = [0.5, 0.7, 0.6, 0.6, 0.5, 0.7]

client = anthropic.Anthropic()

SYSTEM_PROMPT = """Extract preference changes from user messages about headphones.
Return ONLY a JSON object with keys from: price_sensitivity, sound_quality, comfort, battery_life, portability, noise_cancellation.
Values are deltas: positive = more important, negative = less important. Range: -0.3 to +0.3.
Only include keys the message explicitly implies should change. If no change, return {}."""


async def extract_preference_delta(message, current_vector):
    current_state = dict(zip(ATTRIBUTE_KEYS, current_vector))
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Current: {json.dumps(current_state)}\nMessage: {message}",
                }
            ],
        )
        return json.loads(response.content[0].text)
    except Exception:
        return {}
