# Team Coordination — AI Shopping Agent with Auditable Reasoning

24-hour hackathon. 3 people. Clone the repo, pick your role, paste the Claude prompt below, go.

---

## STATUS TRACKER
<!-- Claude: update this table after every completed task, then commit and push -->

| Phase | Person A — Backend | Person B — Data/ML | Person C — Frontend |
|-------|-------------------|-------------------|---------------------|
| **Phase 1** (Hours 0–4) | ✅ Done | ✅ Done | ✅ Done |
| **Phase 2** (Hours 4–10) | ✅ Done | ✅ Done | ✅ Done |
| **Phase 3** (Hours 10–16) | ✅ Done | — | ✅ Done |
| **Phase 4** (Hours 16–22) | ✅ Done | ❌ Blocked on Anthropic account credits (key works, balance $0 → every LLM call returns 400, all agents fall through to AGENT_UNAVAILABLE). Offline sim: 3/4 queries exact; preference prompt sharpened. Rule-based bias flags verified live (Bose source concentration surfaces on Q4). | ⬜ Not started |
| **Phase 5** (Hours 22–24) | ⬜ Not started | — | — |

**Legend:** ⬜ Not started · 🔄 In progress · ✅ Done · ❌ Blocked (note reason)

**Last updated:** 2026-04-18 — B ran the 4 demo queries against live /recommend. API key valid but account credits exhausted → all LLM agents return AGENT_UNAVAILABLE; preference extractor cannot shift state. FAISS retrieval, /health, /recommend/reset, and rule-based bias flags all verified live. Phase 4 attribute tuning blocked until credits added (console.anthropic.com/settings/billing) — once restored, rerun `ANTHROPIC_API_KEY=<new_key> uvicorn backend.main:app` and hit the 4 queries. Shared key should be rotated; it's in the conversation log.

---

## Pick Your Role

| Person | Role | Owns |
|--------|------|------|
| **A** | Backend — agents + API | `backend/agents/`, `backend/main.py`, `backend/models/agent_types.py` |
| **B** | Data/ML — dataset + vectors | `backend/data/`, `backend/models/index.py`, `backend/models/preference.py`, `backend/agents/bias_detector.py` |
| **C** | Frontend — React UI | `frontend/` |

**Do not touch files owned by another person.** If you need something from them, check if it's been pushed — don't guess at the interface.

---

## How to Start (Claude Instructions)

Clone the repo and open Claude Code in the project directory. Then paste this prompt — **replace the letter with yours**:

### If you are Person A, paste this:
```
I am Person A (Backend). Read TEAM.md carefully.

1. Pull latest: git pull origin main
2. Check the STATUS TRACKER in TEAM.md — find the first phase where my column says "Not started"
3. Read my tasks for that phase in the "Person A" section below
4. Implement every task listed for that phase, in order
5. After each task: update my column in STATUS TRACKER (🔄 while working, ✅ when done), commit my changes, and push to main
6. Do not implement tasks owned by Person B or Person C
7. If I need something from B or C that hasn't been pushed yet, stop and tell me what's missing instead of guessing

File ownership — I only write to: backend/agents/, backend/main.py, backend/models/agent_types.py
I may read any file. I update TEAM.md STATUS TRACKER only.
```

### If you are Person B, paste this:
```
I am Person B (Data/ML). Read TEAM.md carefully.

1. Pull latest: git pull origin main
2. Check the STATUS TRACKER in TEAM.md — find the first phase where my column says "Not started"
3. Read my tasks for that phase in the "Person B" section below
4. Implement every task listed for that phase, in order
5. After each task: update my column in STATUS TRACKER (🔄 while working, ✅ when done), commit my changes, and push to main
6. Do not implement tasks owned by Person A or Person C
7. If I need something from A or C that hasn't been pushed yet, stop and tell me what's missing instead of guessing

File ownership — I only write to: backend/data/, backend/models/index.py, backend/models/preference.py, backend/agents/bias_detector.py
I may read any file. I update TEAM.md STATUS TRACKER only.
```

### If you are Person C, paste this:
```
I am Person C (Frontend). Read TEAM.md carefully.

1. Pull latest: git pull origin main
2. Check the STATUS TRACKER in TEAM.md — find the first phase where my column says "Not started"
3. Read my tasks for that phase in the "Person C" section below
4. Implement every task listed for that phase, in order
5. After each task: update my column in STATUS TRACKER (🔄 while working, ✅ when done), commit my changes, and push to main
6. Do not implement tasks owned by Person A or Person B
7. If I need something from A or B that hasn't been pushed yet, stop and tell me what's missing instead of guessing

File ownership — I only write to: frontend/
I may read any file. I update TEAM.md STATUS TRACKER only.
```

---

## Sync Points (all three, do not skip)

| Time | What | Action |
|------|------|--------|
| **Hour 4** | A pushes `agent_types.py` — lock the schema | B and C: pull and confirm you can import `AgentResult` before writing any agent code |
| **Hour 10** | A pushes working `/recommend` endpoint | C: pull and smoke test `curl -X POST http://localhost:8000/recommend -H "Content-Type: application/json" -d '{"message":"test"}'` before wiring frontend |
| **Hour 16** | All three run the 4 demo queries together | Fix any broken paths before splitting into polish work |

---

## Person A — Backend

**You own:** `backend/agents/` · `backend/main.py` · `backend/models/agent_types.py`
**Depends on:** B's `products.json` (needed by Hour 4 to test agents against real data)
**Consumed by:** C's frontend (needs `/recommend` endpoint by Hour 10)

### Phase 1 Tasks (Hours 0–4) — Scaffold

- [ ] Create directory structure:
  ```
  backend/
    __init__.py
    main.py
    agents/
      __init__.py
      base.py
      price_agent.py      (stub)
      specs_agent.py      (stub)
      review_agent.py     (stub)
      bias_detector.py    ← B fills this, leave empty for now
      orchestrator.py     (stub)
    models/
      __init__.py
      agent_types.py
      index.py            ← B fills this
      preference.py       ← B fills this
    data/
      products.json       ← B fills this
  ```

- [ ] Install deps: `pip install fastapi uvicorn anthropic pydantic python-dotenv`

- [ ] Write `backend/models/agent_types.py` (the shared contract — push this first so B and C can import it):
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

- [ ] Write `backend/agents/base.py` — shared Claude API wrapper:
  ```python
  import anthropic, json
  from backend.models.agent_types import AgentResult

  client = anthropic.Anthropic()

  async def call_agent(agent_name, system_prompt, user_message, product_context):
      try:
          response = client.messages.create(
              model="claude-sonnet-4-20250514",
              max_tokens=1000,
              system=system_prompt + "\n\nRespond ONLY with valid JSON: {score, confidence, evidence, flags}. No preamble.",
              messages=[{"role": "user", "content": f"Product: {json.dumps(product_context)}\n\nUser query: {user_message}"}]
          )
          data = json.loads(response.content[0].text)
          data["agent"] = agent_name
          return AgentResult(**data)
      except Exception as e:
          return AgentResult(agent=agent_name, score=0, confidence=0, evidence=[], flags=["AGENT_UNAVAILABLE"])
  ```

- [ ] Create `.env.example` in project root:
  ```
  ANTHROPIC_API_KEY=your_key_here
  ```

- [ ] Stub `backend/main.py` with a `/health` endpoint so C can confirm the server runs

### Phase 2 Tasks (Hours 4–10) — Agents

Dependency: B must have pushed `products.json` before you test agents against real data.

- [ ] Write `backend/agents/price_agent.py`:
  ```python
  from backend.agents.base import call_agent

  SYSTEM = """You are a Price Analysis Agent. Score 0-10: 10 = exceptional value, 0 = price gouging.
  Flag if price is more than 30% above closest competitor for equivalent specs.
  Use ONLY the provided product data. Return evidence as specific price comparisons."""

  async def run_price_agent(product, user_query):
      return await call_agent("price", SYSTEM, user_query, product)
  ```

- [ ] Write `backend/agents/specs_agent.py`:
  ```python
  from backend.agents.base import call_agent

  SYSTEM = """You are a Technical Specifications Agent. Score 0-10 on measurable specs only:
  ANC performance, battery life, codec support, driver quality, build quality.
  Do NOT factor in price or reviews. Flag if any spec is below category average for the price tier.
  Use ONLY the provided product data."""

  async def run_specs_agent(product, user_query):
      return await call_agent("specs", SYSTEM, user_query, product)
  ```

- [ ] Write `backend/agents/review_agent.py`:
  ```python
  from backend.agents.base import call_agent

  SYSTEM = """You are a Review Analysis Agent. Score 0-10 based on:
  sentiment_score (60% weight) and top complaints severity (40% weight).
  Flag if any complaint pattern appears in more than 15% of signals.
  Do NOT factor in specs or price. Use ONLY the provided product data."""

  async def run_review_agent(product, user_query):
      return await call_agent("review", SYSTEM, user_query, product)
  ```

- [ ] Write `backend/agents/orchestrator.py`:
  ```python
  import asyncio
  from backend.models.agent_types import ConflictReport, ReasoningChain
  from backend.agents.price_agent import run_price_agent
  from backend.agents.specs_agent import run_specs_agent
  from backend.agents.review_agent import run_review_agent
  from backend.agents.bias_detector import run_bias_detector

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

### Phase 3 Tasks (Hours 10–16) — FastAPI Endpoint

- [ ] Write complete `backend/main.py`:
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
  ```

- [ ] Verify with: `uvicorn backend.main:app --reload` then `curl http://localhost:8000/health`

### Phase 4 Tasks (Hours 16–22) — Hardening

- [ ] Add 10s asyncio timeout to every agent call in `base.py`; return `AGENT_UNAVAILABLE` on timeout
- [ ] Add FAISS fallback in `main.py`: if `query_index` raises, sort `PRODUCTS` by attribute sum and return top 5
- [ ] Test: kill one agent by raising an exception, confirm endpoint still returns 5 results with one degraded

---

## Person B — Data/ML

**You own:** `backend/data/products.json` · `backend/models/index.py` · `backend/models/preference.py` · `backend/agents/bias_detector.py`
**Critical:** `products.json` is the dependency everything else runs on — push it before Hour 4
**Depends on:** A's `agent_types.py` (needed before writing `bias_detector.py`)

### Phase 1 Tasks (Hours 0–4) — Product Dataset

- [ ] Install deps: `pip install faiss-cpu numpy anthropic python-dotenv`

- [ ] Create `backend/data/products.json` with 20 headphones. Build the 8 hero products first:

  | Product | Key tension to encode |
  |---------|----------------------|
  | Sony WH-1000XM5 | specs dominant (sound 0.92), comfort low (0.61) — comfort complaints after 2h |
  | Bose QC45 | comfort dominant (0.88), amazon source > 0.55 → triggers source concentration flag |
  | Apple AirPods Pro 2 | high price sensitivity penalty (0.3), ecosystem angle |
  | Sennheiser HD 660S | audiophile sound (0.95), ANC = 0.0, portability = 0.2 |
  | Jabra Evolve2 85 | enterprise-tuned, low consumer sentiment (0.52) |
  | Sony WH-1000XM4 | budget vs XM5 (price 199), similar but lower specs |
  | Anker Soundcore Q45 | very low price (79), decent specs — best budget value |
  | Skullcandy Crusher Evo | star rating 4.3 (normalized 0.86) + sentiment 0.58 → triggers score/sentiment divergence |

  Required schema per product:
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

  Bias Detector auto-triggers when:
  - `aggregate_score / 5 > 0.84 AND sentiment_score < 0.65` → score/sentiment divergence flag
  - Any `source_distribution` value `> 0.55` → source concentration flag

  Push `products.json` as soon as hero products are done, even if you haven't added the filler 12 yet.

### Phase 2 Tasks (Hours 4–10) — FAISS Index + Preference Model + Bias Detector

Dependency: pull A's `agent_types.py` before writing `bias_detector.py`.

- [ ] Write `backend/models/index.py`:
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

- [ ] Write `backend/models/preference.py`:
  ```python
  import anthropic, json

  ATTRIBUTE_KEYS = ["price_sensitivity", "sound_quality", "comfort", "battery_life", "portability", "noise_cancellation"]
  DEFAULT_PREFERENCE_VECTOR = [0.5, 0.7, 0.6, 0.6, 0.5, 0.7]
  client = anthropic.Anthropic()

  async def extract_preference_delta(message, current_vector):
      current_state = dict(zip(ATTRIBUTE_KEYS, current_vector))
      try:
          response = client.messages.create(
              model="claude-sonnet-4-20250514",
              max_tokens=300,
              system="""Extract preference changes from user messages about headphones.
  Return ONLY a JSON object with keys from: price_sensitivity, sound_quality, comfort, battery_life, portability, noise_cancellation.
  Values are deltas: positive = more important, negative = less important. Range: -0.3 to +0.3.
  Only include keys the message explicitly implies should change. If no change, return {}.""",
              messages=[{"role": "user", "content": f"Current: {json.dumps(current_state)}\nMessage: {message}"}]
          )
          return json.loads(response.content[0].text)
      except:
          return {}
  ```

- [ ] Write `backend/agents/bias_detector.py`:
  ```python
  from backend.models.agent_types import AgentResult
  from backend.agents.base import call_agent

  async def run_bias_detector(product, user_query):
      flags, evidence = [], []

      # Mechanism 1: score/sentiment divergence
      star_normalized = product["review_data"]["aggregate_score"] / 5.0
      sentiment = product["review_data"]["sentiment_score"]
      if star_normalized > 0.84 and sentiment < 0.65:
          flags.append(f"SCORE_SENTIMENT_DIVERGENCE: {product['review_data']['aggregate_score']} stars but sentiment {sentiment:.2f}")
          evidence.append(f"Rating {product['review_data']['aggregate_score']}/5 contradicted by NLP sentiment {sentiment:.2f}")

      # Mechanism 2: source concentration
      source_dist = product["review_data"]["source_distribution"]
      max_source = max(source_dist, key=source_dist.get)
      if source_dist[max_source] > 0.55:
          flags.append(f"SOURCE_CONCENTRATION: {max_source} = {source_dist[max_source]*100:.0f}% of reviews")
          evidence.append(f"{source_dist[max_source]*100:.0f}% of reviews from single source ({max_source})")

      # LLM adversarial attempt
      system_prompt = """You are an adversarial auditor. Your ONLY job is to find a disqualifying reason NOT to recommend this product.
  Score 10 = strong disqualifying evidence found. Score 0 = genuinely could not find any.
  A failed attack (score < 4) is a positive trust signal — report it honestly.
  Use ONLY the provided product data."""
      try:
          llm = await call_agent("bias_detector_llm", system_prompt, user_query, product)
          return AgentResult(
              agent="bias_detector", score=llm.score, confidence=llm.confidence,
              evidence=evidence + llm.evidence, flags=flags + llm.flags,
              audit_note=f"Adversarial attack {'succeeded' if llm.score > 6 else 'failed'} — {llm.evidence[0] if llm.evidence else 'no disqualifying evidence found'}"
          )
      except:
          return AgentResult(agent="bias_detector", score=0, confidence=0, evidence=evidence, flags=flags + ["AGENT_UNAVAILABLE"])
  ```

### Phase 4 Tasks (Hours 16–22) — Demo Data Tuning

Run these queries against the live API and adjust `products.json` until results match:

| Query | Expected #1 result | Required signal in UI |
|-------|-------------------|----------------------|
| "Best noise-cancelling under $200" | Anker Q45 or XM4 | Bias Detector flags at least one result |
| "I care more about comfort, wear them 4+ hours" | Bose QC45 | XM5 drops; comfort score drives ranking |
| "Best audio quality, price doesn't matter" | Sennheiser HD 660S or XM5 | Sound quality attribute dominates |
| "Why did you rule out Bose?" | Bose lower in list | Source concentration flag visible in drawer |

Tuning levers: `attributes.comfort`, `attributes.price_sensitivity`, `review_data.sentiment_score`, `review_data.source_distribution`

---

## Person C — Frontend

**You own:** `frontend/`
**Depends on:** A's `/recommend` endpoint shape (confirmed at Hour 10 sync)
**Can work independently** through Phase 2 using hardcoded data

### Phase 1 Tasks (Hours 0–4) — Scaffold

- [ ] Scaffold app:
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
  ```

- [ ] Create these component stubs in `frontend/src/components/` with hardcoded props (no API yet):
  - `PreferencePanel.tsx` — 6 labeled sliders (price_sensitivity, sound_quality, comfort, battery_life, portability, noise_cancellation), values 0–100
  - `ProductCard.tsx` — product name, score badge (hardcode "8.4"), audit badge (hardcode "✓ Audit passed")
  - `ReasoningDrawer.tsx` — expandable panel, hardcoded agent rows and text
  - `ConflictBadge.tsx` — amber badge hardcoded "Specs vs Review conflict"
  - `ChatInput.tsx` — text input + submit button, no handler
  - `SkeletonCard.tsx` — grey placeholder matching ProductCard height

- [ ] Wire all into `src/App.tsx` so the layout is visible at `npm run dev`

### Phase 2 Tasks (Hours 4–10) — Real Component Logic

Keep hardcoded data but build the real rendering logic so wiring the API in Phase 3 is just a data swap.

- [ ] `ReasoningDrawer.tsx` — highest value component, build this properly:
  - Agent score grid: 4 rows (price / specs / review / bias_detector), show score + confidence per row
  - Evidence per agent: collapsed list, click to expand
  - Conflict callout: amber/red banner when `conflict_report.exists === true`, shows `conflict_report.description`
  - Audit result: green panel when `audit_passed === true` ("System tried to disprove this — failed"), red when false
  - Flags list: render each flag as a pill if `flags.length > 0`

- [ ] `ConflictBadge.tsx` — amber if `max_spread` between 2.5–4, red if > 4; tooltip on hover shows description

- [ ] `ProductCard.tsx` — show name, `final_score`, `audit_passed` badge, `ConflictBadge` if conflict exists, click to expand `ReasoningDrawer`

### Phase 3 Tasks (Hours 10–16) — Wire to Live API

Pull A's latest first. Smoke test the endpoint before wiring.

- [ ] Write `frontend/src/hooks/useRecommendations.ts`:
  ```typescript
  import { useState } from 'react';

  const API = 'http://localhost:8000';

  export function useRecommendations() {
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [preferenceVector, setPreferenceVector] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    const query = async (message: string, overrideVector?: number[]) => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, preference_vector: overrideVector ?? null })
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

- [ ] Replace all hardcoded data in components with real props from `useRecommendations`
- [ ] Slider onChange: call `query("update preferences", newVectorAsArray)` — backend handles the rest
- [ ] Show `<SkeletonCard />` for each of 5 slots while `loading === true`
- [ ] Add Reset button that calls `reset()`

### Phase 4 Tasks (Hours 16–22) — Polish

- [ ] Animate `ReasoningDrawer` expand/collapse (CSS transition or Framer Motion)
- [ ] Confirm `ConflictBadge` is visible on the card without opening the drawer
- [ ] Test at 1280px width (typical presentation laptop)
- [ ] Run all 4 demo queries — confirm the UI tells the story without verbal narration

---

## Demo Script (all three rehearse)

**Opening line:** "Most AI recommendation systems explain their answers. This one tries to disprove them first."

| # | Query | What to show |
|---|-------|-------------|
| 1 | `"Find me the best noise-cancelling headphones under $200"` | Bias Detector flags one result; conflict badge visible on XM5 |
| 2 | `"I care more about comfort, I wear them for 4+ hours"` | Sliders shift; ranking changes; comfort signal dominates in drawer |
| 3 | Drag price slider up to ~$250 | Re-rank fires live; previously excluded products enter |
| 4 | `"Why did you rule out Bose?"` | Bose shows source concentration flag + audit failure in drawer |

---

## Architecture Reference

```
User Query + Preference State
          ↓
    POST /recommend  ← Person A
          ↓
    FAISS re-ranking  ← Person B
          ↓
    asyncio.gather  ← Person A
    ├── Price Agent    → AgentResult
    ├── Specs Agent    → AgentResult
    ├── Review Agent   → AgentResult
    └── Bias Detector  → AgentResult  ← Person B
          ↓
    Conflict Detection  ← Person A
    Adversarial Audit Gate
          ↓
    ReasoningChain JSON
          ↓
    React UI  ← Person C
    PreferencePanel | ProductCards | ReasoningDrawer
```
