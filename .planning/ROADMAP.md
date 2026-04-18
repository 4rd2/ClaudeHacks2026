# Roadmap: AI Shopping Agent with Auditable Reasoning

## Overview

Five time-boxed phases deliver a demo-ready multi-agent headphone recommender in 24 hours. Phase 1 lays the data and vector foundation. Phase 2 builds all four agents, conflict detection, and the adversarial audit pipeline. Phase 3 wires the FastAPI endpoint to a React frontend so every slider change triggers live re-ranking and exposes the full reasoning chain. Phase 4 hardens fallbacks, tunes the dataset for compelling demo tensions, and polishes the UI. Phase 5 prepares the presentation and records a contingency demo.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Data** - Scaffold project, build headphone dataset, initialize FAISS index
- [ ] **Phase 2: Core Agents** - All 4 agents, orchestrator, conflict detection, adversarial audit pipeline
- [ ] **Phase 3: Integration** - FastAPI endpoint live, React frontend consuming real API with full reasoning UI
- [ ] **Phase 4: Polish & Demo Hardening** - Fallback hardening, dataset tuning, UI polish, rehearsal
- [ ] **Phase 5: Final** - Presentation prep, contingency recording, submission

## Phase Details

### Phase 1: Foundation & Data
**Goal**: The working environment is scaffolded and the product dataset is queryable via FAISS
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, VECTOR-01, VECTOR-02
**Success Criteria** (what must be TRUE):
  1. A Python script loads the 20-headphone JSON and all required fields are present and parseable
  2. The 8-10 hero products (XM5, QC45, AirPods Pro 2, HD 660S, Evolve2 85, budget options) are in the dataset with realistic attribute vectors
  3. FAISS index initializes at startup without error and accepts a 6-dim query vector
  4. Default preference vector [0.5, 0.7, 0.6, 0.6, 0.5, 0.7] is stored and retrievable
  5. The React app shell and FastAPI server both start locally (stubs only — no real logic yet)
**Plans**: TBD
**UI hint**: yes

### Phase 2: Core Agents
**Goal**: All four agents run in parallel, conflicts are detected, and the adversarial audit produces a verdict before any recommendation surfaces
**Depends on**: Phase 1
**Requirements**: AGENTS-01, AGENTS-02, AGENTS-03, AGENTS-04, AGENTS-05, AGENTS-06, AGENTS-07, CONFLICT-01, CONFLICT-02, CONFLICT-03, CONFLICT-04, AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. Calling the agent orchestrator with a product list returns 4 AgentResult envelopes concurrently (verifiable via asyncio timing logs)
  2. Price, Specs, and Review agents each return a score, confidence, evidence list, and flags for a known test product
  3. Bias Detector runs both deterministic checks and an LLM adversarial attempt, returning merged flags
  4. When score spread across the 3 scoring agents exceeds 2.5, conflicting values appear side-by-side (not blended) in the output
  5. A failed adversarial attack (bias score < 4) is reported as a positive trust signal; an agent failure returns a degraded result with AGENT_UNAVAILABLE, never a crash
**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md — Fix agent SYSTEM prompts to TEAM.md canonical + create Wave 0 test scaffold
- [x] 02-02-PLAN.md — Verify orchestrator completeness + write test_orchestrator.py (conflict/audit/parallelism)

### Phase 3: Integration
**Goal**: A user typing a query or moving a slider sees re-ranked headphones with full reasoning chains drawn from the live API
**Depends on**: Phase 2
**Requirements**: API-01, API-02, API-03, API-04, API-05, VECTOR-03, VECTOR-04, VECTOR-05, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08
**Success Criteria** (what must be TRUE):
  1. POST /recommend with a natural language message returns updated preference vector and top-5 ranked products in under 200ms
  2. Moving any of the 6 preference sliders fires a re-rank request and the product list updates without a full page reload
  3. Expanding a product card shows the agent score grid, conflict callout (if spread > 2.5), audit result, evidence bullets, and flags
  4. Conflict callout badge appears amber (spread 2.5-4) or red (spread > 4) on product cards with applicable products
  5. Chat input updates the preference vector via LLM delta extraction and re-renders the ranking; typing "I care more about comfort" shifts comfort-heavy products upward
**Plans**: TBD
**UI hint**: yes

### Phase 4: Polish & Demo Hardening
**Goal**: Every demo beat works reliably, the UI is presentable, and the dataset produces the specific tensions needed for a convincing walkthrough
**Depends on**: Phase 3
**Requirements**: DATA-03, AGENTS-07
**Success Criteria** (what must be TRUE):
  1. Three rehearsed demo queries (comfort-focused, price-focused, audiophile) each produce meaningful agent disagreements visible in the UI
  2. The XM5 comfort conflict and Bose affiliate flag surface correctly during the comfort-focused query
  3. All API calls complete in under 200ms; the FAISS fallback (linear scan) activates and recovers gracefully when triggered manually
  4. Loading skeleton cards appear during every API call; reset button returns sliders to defaults and re-queries
**Plans**: TBD
**UI hint**: yes

### Phase 5: Final
**Goal**: A recorded contingency demo exists and the live presentation is practiced and ready
**Depends on**: Phase 4
**Requirements**: (cross-cutting — no new functional requirements; validates all prior phases end-to-end)
**Success Criteria** (what must be TRUE):
  1. A recorded walkthrough covering all three demo queries plays back correctly with no dependency on live API
  2. The team can deliver the full demo narrative (agent parallelism, conflict surfacing, adversarial audit trust story) in under 5 minutes without prompting
  3. The submission package is complete
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Data | 0/? | Not started | - |
| 2. Core Agents | 0/2 | Planned | - |
| 3. Integration | 0/? | Not started | - |
| 4. Polish & Demo Hardening | 0/? | Not started | - |
| 5. Final | 0/? | Not started | - |
