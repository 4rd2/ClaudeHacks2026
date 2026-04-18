# Requirements — AI Shopping Agent with Auditable Reasoning

## v1 Requirements

### DATA — Product Dataset

- [ ] **DATA-01**: System has a pre-seeded JSON dataset of 20 headphone products with all required fields: id, name, price, specs (noise_cancellation, sound_quality, battery_hours, weight_grams, driver_size_mm), attributes (6-dim normalized: price_sensitivity, sound_quality, comfort, battery_life, portability, noise_cancellation), review_data (aggregate_score, sentiment_score, review_count, source_distribution, top_complaints, top_praises), affiliate_link_density
- [ ] **DATA-02**: Dataset includes 8-10 hero products with real-world spec/review tensions: Sony WH-1000XM5, Bose QC45, Apple AirPods Pro 2, Sennheiser HD 660S, Jabra Evolve2 85, and 2+ budget options
- [ ] **DATA-03**: Dataset is tuned so demo queries produce meaningful agent disagreements (XM5 comfort conflict, Bose affiliate flag, budget price-signal dominance)

### VECTOR — FAISS Search & Preference Model

- [ ] **VECTOR-01**: FAISS index built over 6-dimensional product attribute vectors at startup; supports cosine similarity via inner product on L2-normalized vectors
- [ ] **VECTOR-02**: Preference vector stored in same 6-dim space as product attributes; default vector initialized to [0.5, 0.7, 0.6, 0.6, 0.5, 0.7]
- [ ] **VECTOR-03**: FAISS query returns top-5 ranked products in under 200ms
- [ ] **VECTOR-04**: LLM extracts preference deltas from natural language messages ("I care more about comfort" → {"comfort": +0.3, "sound_quality": -0.2}); deltas clamped to ±0.3; fallback to {} on parse failure
- [ ] **VECTOR-05**: Preference vector updates on every /recommend call and re-ranks products accordingly

### AGENTS — Parallel Multi-Agent Evaluation

- [ ] **AGENTS-01**: All 4 agents run concurrently via asyncio.gather per /recommend call
- [ ] **AGENTS-02**: Price Agent returns AgentResult scoring 0-10 on value relative to competitors; flags if price > 30% above equivalent spec tier
- [ ] **AGENTS-03**: Specs Agent returns AgentResult scoring 0-10 on objective technical specs only (ANC, battery, codec, build quality); flags if any spec below category average for price tier
- [ ] **AGENTS-04**: Review Agent returns AgentResult scoring 0-10 based on sentiment_score (60%) and complaint severity (40%); flags complaint patterns in > 15% of signals
- [ ] **AGENTS-05**: Bias Detector runs 2 deterministic checks (score/sentiment divergence: star_normalized > 0.84 AND sentiment < 0.65; source concentration: single source > 55%) then LLM adversarial attempt; returns AgentResult with merged flags
- [ ] **AGENTS-06**: All agents use standardized AgentResult envelope: {agent, score, confidence, evidence[], flags[], audit_note?}
- [ ] **AGENTS-07**: Agent failures return degraded AgentResult with confidence: 0 and flags: ["AGENT_UNAVAILABLE"] — requests never crash

### CONFLICT — Resolution & Surfacing

- [ ] **CONFLICT-01**: Conflict detection fires when max_score - min_score > 2.5 across the 3 scoring agents (Price, Specs, Review)
- [ ] **CONFLICT-02**: Conflicting scores are NOT blended — both values appear in the reasoning chain with agent attribution
- [ ] **CONFLICT-03**: Clean sweep anomaly detected when all agent scores > 8.5 with no flags; surfaced as CLEAN_SWEEP_ANOMALY flag
- [ ] **CONFLICT-04**: Final score is confidence-weighted average of the 3 scoring agents (Bias Detector excluded from scoring)

### AUDIT — Adversarial Self-Audit

- [ ] **AUDIT-01**: Bias Detector LLM call explicitly attempts to construct a disqualifying case against the top-ranked product
- [ ] **AUDIT-02**: audit_passed = true when bias flags are empty OR bias detector score < 6
- [ ] **AUDIT-03**: Failed adversarial attack (score < 4) is reported in reasoning chain as a positive trust signal
- [ ] **AUDIT-04**: Products with audit_passed = false are ranked below audit-passing products (not suppressed from results)

### API — Backend Endpoint

- [ ] **API-01**: FastAPI POST /recommend accepts {message: str, preference_vector?: float[]} and returns {preference_vector: dict, recommendations: ReasoningChain[]}
- [ ] **API-02**: ReasoningChain includes: product_id, product_name, agent_results[], conflict_report, audit_passed, audit_attempts[], final_score, recommendation_rank
- [ ] **API-03**: CORS enabled for local React dev (allow_origins=["*"])
- [ ] **API-04**: GET /health endpoint returns agent availability status
- [ ] **API-05**: FAISS fallback: if index query fails, return top-5 by linear scan on final_score

### UI — Frontend

- [ ] **UI-01**: React app with 6 preference sliders (price_sensitivity, sound_quality, comfort, battery_life, portability, noise_cancellation); each labeled with 0-100% display
- [ ] **UI-02**: Slider change fires POST /recommend with updated preference vector; optimistic UI update then re-render on response
- [ ] **UI-03**: Product ranking list showing top 5 results with name, final_score, audit status badge
- [ ] **UI-04**: Reasoning chain drawer per product: expandable panel showing agent score grid (4 agents × score + confidence), conflict callout (if exists), audit result, evidence bullets, flags list
- [ ] **UI-05**: Conflict callout badge on product card: amber for spread 2.5-4, red for spread > 4; hover shows conflict description
- [ ] **UI-06**: Loading skeleton cards during API calls (not spinner)
- [ ] **UI-07**: Reset button clears preference state to defaults and re-queries
- [ ] **UI-08**: Chat input for natural language queries that update preference vector and trigger re-ranking

## v2 Requirements (Deferred)

- Live pricing via SerpAPI for top recommendation (stretch: Hours 20-22 only)
- Preference state persistence across sessions (localStorage)
- "Convince me otherwise" button — forces Bias Detector to find disqualifying evidence
- Animated preference vector radar chart visualization
- Mobile-responsive layout

## Out of Scope

- Live web scraping (Amazon, Reddit, forums) — demo-day time bomb; anti-bot measures are not negotiable
- GPU-accelerated FAISS (faiss-gpu) — performance gain is unmeasurable at 20 vectors; false claim
- User authentication or account management — not relevant to demo scenario
- Categories beyond headphones — broader dataset dilutes the specific tensions that make the demo work
- WebSocket transport — REST sufficient; complexity not justified unless slider latency is measured as a problem
- General adversarial capability (claimed Bias Detector) — replaced by 2 specific, defensible mechanisms

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1: Foundation & Data | Pending |
| DATA-02 | Phase 1: Foundation & Data | Pending |
| DATA-03 | Phase 1: Foundation & Data (initial); Phase 4: Polish & Demo Hardening (tuning) | Pending |
| VECTOR-01 | Phase 1: Foundation & Data | Pending |
| VECTOR-02 | Phase 1: Foundation & Data | Pending |
| VECTOR-03 | Phase 3: Integration | Pending |
| VECTOR-04 | Phase 3: Integration | Pending |
| VECTOR-05 | Phase 3: Integration | Pending |
| AGENTS-01 | Phase 2: Core Agents | Pending |
| AGENTS-02 | Phase 2: Core Agents | Pending |
| AGENTS-03 | Phase 2: Core Agents | Pending |
| AGENTS-04 | Phase 2: Core Agents | Pending |
| AGENTS-05 | Phase 2: Core Agents | Pending |
| AGENTS-06 | Phase 2: Core Agents | Pending |
| AGENTS-07 | Phase 2: Core Agents (impl); Phase 4: Polish & Demo Hardening (hardening) | Pending |
| CONFLICT-01 | Phase 2: Core Agents | Pending |
| CONFLICT-02 | Phase 2: Core Agents | Pending |
| CONFLICT-03 | Phase 2: Core Agents | Pending |
| CONFLICT-04 | Phase 2: Core Agents | Pending |
| AUDIT-01 | Phase 2: Core Agents | Pending |
| AUDIT-02 | Phase 2: Core Agents | Pending |
| AUDIT-03 | Phase 2: Core Agents | Pending |
| AUDIT-04 | Phase 2: Core Agents | Pending |
| API-01 | Phase 3: Integration | Pending |
| API-02 | Phase 3: Integration | Pending |
| API-03 | Phase 3: Integration | Pending |
| API-04 | Phase 3: Integration | Pending |
| API-05 | Phase 3: Integration | Pending |
| UI-01 | Phase 3: Integration | Pending |
| UI-02 | Phase 3: Integration | Pending |
| UI-03 | Phase 3: Integration | Pending |
| UI-04 | Phase 3: Integration | Pending |
| UI-05 | Phase 3: Integration | Pending |
| UI-06 | Phase 3: Integration | Pending |
| UI-07 | Phase 3: Integration | Pending |
| UI-08 | Phase 3: Integration | Pending |
