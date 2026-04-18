# Team Coordination — AI Shopping Agent with Auditable Reasoning

24-hour hackathon. 3 people. Read your role section, then start immediately.

## Pick Your Role

| Person | Role | Primary Directory |
|--------|------|-------------------|
| **A — Backend** | Agent system + FastAPI API | `backend/agents/`, `backend/main.py` |
| **B — Data/ML** | Product dataset + FAISS + preference model | `backend/data/`, `backend/models/` |
| **C — Frontend** | React UI + API integration | `frontend/src/` |

Read the full project brief: `.planning/PROJECT.md`
Read all requirements: `.planning/REQUIREMENTS.md`

---

## Sync Points (do not skip)

| Time | What | Who |
|------|------|-----|
| Hour 4 | A shares `backend/models/agent_types.py` — lock the AgentResult schema | All |
| Hour 10 | A demos `/recommend` request/response shape before frontend wires up | All |
| Hour 16 | Full smoke test — run all 4 demo queries together, fix before polishing | All |

---

## Person A — Backend

You own the agent system and the API. B gives you data; C consumes your API.

### Setup (do first)
```bash
cd backend
pip install fastapi uvicorn httpx asyncio python-dotenv anthropic sentence-transformers faiss-cpu pydantic
```

Create `.env` in project root:
```
ANTHROPIC_API_KEY=your_key_here
```

### Hours 0–4 — Scaffold

1. Create this directory structure:
```
backend/
  main.py
  agents/
    __init__.py
    base.py
    price_agent.py
    specs_agent.py
    review_agent.py
    bias_detector.py
    orchestrator.py
  models/
    __init__.py
    agent_types.py
    index.py
    preference.py
  data/
    products.json   ← B fills this
```

2. Write `backend/models/agent_types.py` — **share this with B and C at Hour 4**:
```python
from pydantic import BaseModel
from typing import Optional

class AgentResult(BaseModel):
    agent: str
    score: float          # 0-10
    confidence: float     # 0-1
    evidence: list[str]
    flags: list[str]
    audit_note: Optional[str] = None

class ConflictReport(BaseModel):
    exists: bool
    max_spread: float
    conflicting_agents: list[str]
    description: str

class ReasoningChain(BaseModel):
    product_id: str
    product_name: str
    agent_results: list[AgentResult]
    conflict_report: ConflictReport
    audit_passed: bool
    audit_attempts: list[str]
    final_score: float
    recommendation_rank: int
```

3. Write `backend/agents/base.py` — shared Claude API wrapper all agents use:
```python
import anthropic
import json
from backend.models.agent_types import AgentResult

client = anthropic.Anthropic()

async def call_agent(agent_name, system_prompt, user_message, product_context):
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system_prompt + "\n\nRespond ONLY with valid JSON: {agent, score, confidence, evidence, flags}. No preamble.",
        messages=[{"role": "user", "content": f"Product: {json.dumps(product_context)}\n\nUser query: {user_message}"}]
    )
    data = json.loads(response.content[0].text)
    data["agent"] = agent_name
    return AgentResult(**data)
```

### Hours 4–10 — Agents

Write each agent in `backend/agents/`. Each calls `base.call_agent` with a different system prompt.

**price_agent.py** system prompt:
> You are a Price Analysis Agent. Score 0-10: 10 = exceptional value, 0 = price gouging relative to spec tier. Flag if price is more than 30% above closest competitor for equivalent specs. Return evidence as specific price comparisons. Use only the provided product data.

**specs_agent.py** system prompt:
> You are a Technical Specifications Agent. Score 0-10 based purely on measurable specs: ANC performance, driver quality, battery, codec support, build quality. Do not factor in price or reviews. Flag if any spec is below category average for the price tier. Use only the provided product data.

**review_agent.py** system prompt:
> You are a Review Analysis Agent. Score 0-10 based on: sentiment_score (weighted 60%), top complaints severity (weighted 40%). Flag if any complaint pattern appears in more than 15% of signals. Do not factor in specs or price. Use only the provided product data.

**orchestrator.py** — runs all 4 agents in parallel, detects conflicts:
```python
import asyncio
from backend.models.agent_types import AgentResult, ConflictReport, ReasoningChain

CONFLICT_THRESHOLD = 2.5

def detect_conflict(results):
    scored = [r for r in results if r.agent != "bias_detector"]
    scores = [r.score for r in scored]
    spread = max(scores) - min(scores)
    if spread > CONFLICT_THRESHOLD:
        desc = " vs ".join([f"{r.agent} ({r.score:.1f})" for r in sorted(scored, key=lambda x: x.score, reverse=True)])
        return ConflictReport(exists=True, max_spread=spread, conflicting_agents=[r.agent for r in scored], description=desc)
    return ConflictReport(exists=False, max_spread=spread, conflicting_agents=[], description="Agents in agreement.")

async def evaluate_product(product, user_query):
    from backend.agents.price_agent import run_price_agent
    from backend.agents.specs_agent import run_specs_agent
    from backend.agents.review_agent import run_review_agent
    from backend.agents.bias_detector import run_bias_detector

    results = list(await asyncio.gather(
        run_price_agent(product, user_query),
        run_specs_agent(product, user_query),
        run_review_agent(product, user_query),
        run_bias_detector(product, user_query)
    ))

    conflict = detect_conflict(results)
    bias = next(r for r in results if r.agent == "bias_detector")
    audit_passed = len(bias.flags) == 0 or bias.score < 6

    core = [r for r in results if r.agent != "bias_detector"]
    if all(r.score > 8.5 for r in core) and not bias.flags:
        bias.flags.append("CLEAN_SWEEP_ANOMALY: all agents scored above 8.5 with no flags")
        audit_passed = False

    final_score = sum(r.score * r.confidence for r in core) / sum(r.confidence for r in core)

    return ReasoningChain(
        product_id=product["id"], product_name=product["name"],
        agent_results=results, conflict_report=conflict,
        audit_passed=audit_passed, audit_attempts=[bias.audit_note or ""],
        final_score=final_score, recommendation_rank=0
    )
```

**Fallback rule:** wrap every agent call in try/except — on failure return:
```python
AgentResult(agent=agent_name, score=0, confidence=0, evidence=[], flags=["AGENT_UNAVAILABLE"])
```

### Hours 10–16 — FastAPI Endpoint

Write `backend/main.py`:
```python
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
    delta = await extract_preference_delta(req.message, preference_state)
    for k, v in delta.items():
        if k in ATTRIBUTE_KEYS:
            idx = ATTRIBUTE_KEYS.index(k)
            preference_state[idx] = max(0.0, min(1.0, preference_state[idx] + v))

    candidates = query_index(INDEX, PRODUCTS, preference_state, top_k=5)
    chains = list(await asyncio.gather(*[evaluate_product(p, req.message) for p, _ in candidates]))
    chains = sorted(chains, key=lambda c: (c.audit_passed, c.final_score), reverse=True)
    for i, c in enumerate(chains): c.recommendation_rank = i + 1

    return {"preference_vector": dict(zip(ATTRIBUTE_KEYS, preference_state)), "recommendations": [c.model_dump() for c in chains]}

@app.post("/recommend/reset")
async def reset():
    global preference_state
    preference_state = DEFAULT_PREFERENCE_VECTOR.copy()
    return {"preference_vector": dict(zip(ATTRIBUTE_KEYS, preference_state))}

@app.get("/health")
async def health():
    return {"status": "ok"}
```

Run with: `uvicorn backend.main:app --reload`

### Hours 16–22 — Hardening

- Add 10s timeout to every agent call; return `AGENT_UNAVAILABLE` on timeout
- If FAISS index fails: sort `PRODUCTS` by a simple attribute sum as fallback
- Test: kill one agent mid-demo, confirm the response still returns 3 valid agents + 1 degraded

---

## Person B — Data/ML

You own the dataset and the vector layer. Your `products.json` is the dependency everything else runs on — **start here first**.

### Setup (do first)
```bash
cd backend
pip install faiss-cpu sentence-transformers anthropic python-dotenv
```

### Hours 0–4 — Product Dataset

Create `backend/data/products.json`. This is the most important thing you will do — everything else runs on this data.

**Start with these 8 hero products first** (add filler after):

| Product | Key tension to encode |
|---------|----------------------|
| Sony WH-1000XM5 | High specs (9.2), low comfort (0.61) — comfort complaints after 2h |
| Bose QC45 | High comfort (0.88), affiliate source dominant (amazon > 55%) |
| Apple AirPods Pro 2 | High price sensitivity penalty, ecosystem lock-in angle |
| Sennheiser HD 660S | Audiophile (sound 0.95), no ANC (0.0), no portability |
| Jabra Evolve2 85 | Enterprise-tuned, low consumer sentiment |
| Sony WH-1000XM4 | Budget relative to XM5, slightly lower specs |
| Anker Soundcore Q45 | Low price, decent specs — best budget value signal |
| Skullcandy Crusher Evo | High score/sentiment divergence — star rating vs NLP sentiment gap |

**Required schema per product:**
```json
{
  "id": "sony-wh1000xm5",
  "name": "Sony WH-1000XM5",
  "price": 279,
  "specs": {
    "noise_cancellation": 9.5,
    "sound_quality": 9.2,
    "battery_hours": 30,
    "weight_grams": 250,
    "driver_size_mm": 30
  },
  "attributes": {
    "price_sensitivity": 0.4,
    "sound_quality": 0.92,
    "comfort": 0.61,
    "battery_life": 0.90,
    "portability": 0.72,
    "noise_cancellation": 0.95
  },
  "review_data": {
    "aggregate_score": 4.6,
    "sentiment_score": 0.71,
    "review_count": 18420,
    "source_distribution": {"amazon": 0.62, "rtings": 0.21, "reddit": 0.17},
    "top_complaints": ["ear cup pressure after 2h", "touch controls oversensitive"],
    "top_praises": ["best ANC available", "excellent call quality", "long battery"]
  },
  "affiliate_link_density": 0.34
}
```

**Bias Detector trigger rules** (encode these in your data):
- `aggregate_score/5 > 0.84 AND sentiment_score < 0.65` → score/sentiment divergence flag fires
- Any `source_distribution` value `> 0.55` → source concentration flag fires
- Bose QC45 should trigger source concentration (amazon > 0.55)
- Skullcandy Crusher Evo should trigger score/sentiment divergence

### Hours 4–10 — FAISS Index + Preference Model

Write `backend/models/index.py`:
```python
import json, numpy as np, faiss

ATTRIBUTE_KEYS = ["price_sensitivity", "sound_quality", "comfort", "battery_life", "portability", "noise_cancellation"]

def build_index(products_path):
    with open(products_path) as f:
        products = json.load(f)
    vectors = np.array([[p["attributes"][k] for k in ATTRIBUTE_KEYS] for p in products], dtype=np.float32)
    faiss.normalize_L2(vectors)
    index = faiss.IndexFlatIP(len(ATTRIBUTE_KEYS))
    index.add(vectors)
    return index, products

def query_index(index, products, preference_vector, top_k=5):
    pv = np.array([preference_vector], dtype=np.float32)
    faiss.normalize_L2(pv)
    scores, indices = index.search(pv, top_k)
    return [(products[i], float(scores[0][j])) for j, i in enumerate(indices[0])]
```

Write `backend/models/preference.py`:
```python
import anthropic, json

ATTRIBUTE_KEYS = ["price_sensitivity", "sound_quality", "comfort", "battery_life", "portability", "noise_cancellation"]
DEFAULT_PREFERENCE_VECTOR = [0.5, 0.7, 0.6, 0.6, 0.5, 0.7]
client = anthropic.Anthropic()

async def extract_preference_delta(message, current_vector):
    current_state = dict(zip(ATTRIBUTE_KEYS, current_vector))
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system="""Extract preference changes from user messages about headphones.
Return ONLY a JSON object with keys from: price_sensitivity, sound_quality, comfort, battery_life, portability, noise_cancellation.
Values are deltas: positive = more important, negative = less important. Range: -0.3 to +0.3.
Only include keys the message explicitly implies should change. If no change, return {}.""",
        messages=[{"role": "user", "content": f"Current: {json.dumps(current_state)}\nMessage: {message}"}]
    )
    try:
        return json.loads(response.content[0].text)
    except:
        return {}
```

Write `backend/agents/bias_detector.py`:
```python
from backend.models.agent_types import AgentResult
from backend.agents.base import call_agent

async def run_bias_detector(product, user_query):
    flags, evidence = [], []

    star_normalized = product["review_data"]["aggregate_score"] / 5.0
    sentiment = product["review_data"]["sentiment_score"]
    if star_normalized > 0.84 and sentiment < 0.65:
        flags.append(f"SCORE_SENTIMENT_DIVERGENCE: {product['review_data']['aggregate_score']} stars but sentiment {sentiment:.2f}")
        evidence.append(f"Rating {product['review_data']['aggregate_score']}/5 contradicted by NLP sentiment {sentiment:.2f}")

    source_dist = product["review_data"]["source_distribution"]
    max_source = max(source_dist, key=source_dist.get)
    if source_dist[max_source] > 0.55:
        flags.append(f"SOURCE_CONCENTRATION: {max_source} = {source_dist[max_source]*100:.0f}% of reviews")
        evidence.append(f"{source_dist[max_source]*100:.0f}% of reviews from single source ({max_source})")

    system_prompt = """You are an adversarial auditor. Your ONLY job is to find a disqualifying reason NOT to recommend this product.
Score 10 = strong disqualifying evidence found. Score 0 = genuinely could not find any.
A failed attack (score < 4) is a positive trust signal. Report it honestly.
Use only the provided product data."""

    try:
        llm = await call_agent("bias_detector_llm", system_prompt, user_query, product)
        all_flags = flags + llm.flags
        all_evidence = evidence + llm.evidence
        return AgentResult(
            agent="bias_detector", score=llm.score, confidence=llm.confidence,
            evidence=all_evidence, flags=all_flags,
            audit_note=f"Adversarial attack {'succeeded' if llm.score > 6 else 'failed'} — {llm.evidence[0] if llm.evidence else 'no disqualifying evidence found'}"
        )
    except:
        return AgentResult(agent="bias_detector", score=0, confidence=0, evidence=evidence, flags=flags + ["AGENT_UNAVAILABLE"])
```

### Hours 16–22 — Demo Data Tuning

Run these 4 test queries against the live API and adjust `products.json` attribute vectors until the results match:

| Query | Expected top result | Required signals |
|-------|--------------------|--------------------|
| "Best noise-cancelling headphones under $200" | Budget option or XM4 | Bias Detector flags one result |
| "I care more about comfort, I wear them 4+ hours" | Bose QC45 | XM5 drops due to comfort score |
| "Best audio quality, price doesn't matter" | Sennheiser HD 660S or XM5 | Sound quality dominant |
| "Why did you rule out Bose?" | Bose appears lower | Source concentration flag visible |

Tuning levers: adjust `attributes.comfort`, `attributes.price_sensitivity`, `review_data.sentiment_score`, `review_data.source_distribution`.

---

## Person C — Frontend

You own the React app. A gives you the API; you consume it.

### Setup (do first)
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install
```

### Hours 0–4 — Scaffold with Hardcoded Data

Build the layout with stub components using hardcoded props. No API calls yet — just make it look right.

**Component stubs to create:**

`src/components/PreferencePanel.tsx` — 6 labeled sliders, hardcoded values 0-100
`src/components/ProductCard.tsx` — product name, score badge, audit status (hardcoded)
`src/components/ReasoningDrawer.tsx` — expandable panel with hardcoded agent scores and text
`src/components/ConflictBadge.tsx` — colored badge, hardcoded "amber" state
`src/components/ChatInput.tsx` — text input + submit button, no handler yet
`src/components/SkeletonCard.tsx` — loading placeholder matching ProductCard dimensions

Wire all into `src/App.tsx` so the full layout is visible. Aim for something that looks like a real product by Hour 4.

### Hours 4–10 — Build Real Components

Keep hardcoded data but build the real component logic:

**ReasoningDrawer** is the highest-value component — invest most time here. It should show:
- Agent score grid: 4 rows (Price / Specs / Review / Bias Detector), columns: score, confidence, evidence (collapsed)
- Conflict callout: red/amber banner if conflict exists, shows description text
- Audit result: green "Audit passed — attack failed" or red "Audit failed — [reason]"
- Evidence bullets per agent (collapsed by default, click to expand)
- Flags list (if any flags present)

**ConflictBadge**: amber if spread 2.5–4, red if spread > 4. Tooltip on hover shows conflict description.

### Hours 10–16 — Wire to Live API

Replace all hardcoded data with real API responses.

Write `src/hooks/useRecommendations.ts`:
```typescript
import { useState } from 'react';

const API = 'http://localhost:8000';

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [preferenceVector, setPreferenceVector] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const query = async (message: string, overrideVector?: Record<string, number>) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, preference_vector: overrideVector ? Object.values(overrideVector) : undefined })
      });
      const data = await res.json();
      setRecommendations(data.recommendations);
      setPreferenceVector(data.preference_vector);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    await fetch(`${API}/recommend/reset`, { method: 'POST' });
    await query('show me headphones');
  };

  return { recommendations, preferenceVector, loading, query, reset };
}
```

**Slider behavior:** on change, fire `query("update preferences", newVector)` — the backend handles it, no separate slider endpoint needed. Optimistic update: move slider immediately, re-render list on response.

**Loading state:** show `<SkeletonCard />` components while `loading === true`.

### Hours 16–22 — Polish

- Animate ReasoningDrawer expand/collapse
- Ensure ConflictBadge is visible without opening the drawer
- Add Reset button that calls `reset()`
- Make sure nothing is broken at 1280px width (typical laptop for presenting)
- Run the 4 demo queries, confirm the UI tells the story without narration

---

## Demo Queries (all three rehearse this)

Run in order during the presentation:

1. `"Find me the best noise-cancelling headphones under $200"` → Bias Detector flags one result; conflict visible on XM5
2. `"I care more about comfort, I wear them for 4+ hours"` → Preference vector shifts; ranking changes; comfort signal dominates
3. Drag the price slider from $200 to $250 range → Re-rank fires; previously excluded products re-enter
4. `"Why did you rule out Bose?"` → Bose appears with source concentration flag + audit failure visible

**Opening line for presentation:** "Most AI recommendation systems explain their answers. This one tries to disprove them first."

---

## Architecture Reference

```
User Query + Preference State
          ↓
    FastAPI /recommend (Person A)
          ↓
    FAISS re-ranking (Person B)
          ↓
┌──────────────────────────────────┐
│  asyncio.gather (Person A)       │
│  Price Agent    → AgentResult    │
│  Specs Agent    → AgentResult    │
│  Review Agent   → AgentResult    │
│  Bias Detector  → AgentResult    │
└──────────────────────────────────┘
          ↓
    Conflict Detection (Person A)
          ↓
    Adversarial Audit Gate (Person B)
          ↓
    ReasoningChain JSON → API response
          ↓
    React UI (Person C)
    PreferencePanel | ProductCards | ReasoningDrawer
```
