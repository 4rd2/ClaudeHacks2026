from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.models.index import build_index, query_index, ATTRIBUTE_KEYS
from backend.models.preference import extract_preference_delta, DEFAULT_PREFERENCE_VECTOR
from backend.agents.orchestrator import evaluate_product
import asyncio

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

INDEX, PRODUCTS = build_index("backend/data/products.json")
preference_state = DEFAULT_PREFERENCE_VECTOR.copy()


class QueryRequest(BaseModel):
    message: str
    preference_vector: list[float] | None = None


@app.post("/recommend")
async def recommend(req: QueryRequest):
    global preference_state
    if req.preference_vector:
        preference_state = req.preference_vector
    else:
        delta = await extract_preference_delta(req.message, preference_state)
        for k, v in delta.items():
            if k in ATTRIBUTE_KEYS:
                idx = ATTRIBUTE_KEYS.index(k)
                preference_state[idx] = max(0.0, min(1.0, preference_state[idx] + v))
    candidates = query_index(INDEX, PRODUCTS, preference_state, top_k=5)
    chains = list(await asyncio.gather(*[evaluate_product(p, req.message) for p, _ in candidates]))
    chains = sorted(chains, key=lambda c: (c.audit_passed, c.final_score), reverse=True)
    for i, c in enumerate(chains):
        c.recommendation_rank = i + 1
    return {"preference_vector": dict(zip(ATTRIBUTE_KEYS, preference_state)), "recommendations": [c.model_dump() for c in chains]}


@app.post("/recommend/reset")
async def reset():
    global preference_state
    preference_state = DEFAULT_PREFERENCE_VECTOR.copy()
    return {"preference_vector": dict(zip(ATTRIBUTE_KEYS, preference_state))}


@app.get("/health")
async def health():
    return {"status": "ok", "products_loaded": len(PRODUCTS)}
