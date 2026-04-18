# AI Shopping Agent with Auditable Reasoning

## What This Is

A multi-agent shopping system for noise-cancelling headphones where four specialized agents (Price, Specs, Review, Bias Detector) evaluate products in parallel, an adversarial self-audit attempts to disqualify the top recommendation before it surfaces, and a preference model updates in real time via FAISS vector search. Every recommendation includes a full audit log showing what agents agreed on, where they disagreed, and what the system tried to disprove — framing explainability as a correctness guarantee, not a UI feature.

## Core Value

Before any recommendation reaches the user, the system tried to disqualify it and couldn't — this adversarial self-audit is what separates the system from transparency theater built on corrupted data.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Pre-seeded dataset of 20 headphones with full structured data (price, specs, review sentiment, source distribution, affiliate density)
- [ ] FAISS vector index over 6-dimensional product attribute space with sub-200ms re-ranking
- [ ] Natural language preference extraction that updates preference vector per conversation turn
- [ ] 4 parallel async agents (Price, Specs, Review, Bias Detector) each returning standardized score envelopes
- [ ] Conflict detection that surfaces agent disagreements > 2.5 score spread explicitly (not blended)
- [ ] Adversarial self-audit with 2 deterministic mechanisms (score/sentiment divergence, source concentration) + LLM attack attempt
- [ ] Structured reasoning chain JSON assembled per recommendation with full audit log
- [ ] FastAPI /recommend endpoint returning ranked recommendations with reasoning chains
- [ ] React frontend with 6-dimension preference sliders that trigger live re-ranking
- [ ] Reasoning chain drawer per product showing agent scores, conflicts, audit result, and evidence
- [ ] Conflict callout badge on product cards when score spread > 2.5

### Out of Scope

- Live web scraping (Amazon, Reddit) — fragile under hackathon conditions; use pre-seeded data only
- GPU-accelerated FAISS — not measurable at 20-product scale; faiss-cpu is correct
- User authentication / session persistence — not relevant to demo
- Categories beyond headphones — focused dataset makes demo tensions more convincing
- WebSocket transport — REST is sufficient; assess only if preference drift UI demands it

## Context

**Hackathon context:** 24 hours, 3 generalist developers, judged equally on innovation / impact / technical complexity / presentation.

**Data strategy:** 20 hand-curated headphones anchored by 8-10 hero products with known real-world tensions (Sony XM5: specs dominant, comfort complaints after 2h; Bose QC45: comfort dominant, specs weaker; Apple AirPods Pro 2: ecosystem lock-in angle; Sennheiser HD 660S: audiophile, no ANC; Jabra Evolve2 85: enterprise-optimized; budget options for price agent signal). Static JSON — no live scraping.

**Key trust narrative:** The Bias Detector reframes explainability from a UI feature into a correctness guarantee. "The system tried to disprove its answer before showing it to you" is the core demo hook. A failed adversarial attack is a positive signal.

**Preference model:** 6 dimensions — price_sensitivity, sound_quality, comfort, battery_life, portability, noise_cancellation. Stored as a vector in the same embedding space as product attributes. LLM extracts deltas from natural language; FAISS re-ranks via weighted dot product. Makes abstract embedding concept tangible via slider UI.

**Conflict resolution rule:** Do NOT blend scores when spread > 2.5. Surface the tension explicitly. The disagreement IS the value — averaging hides it.

## Constraints

- **Timeline**: 24-hour hackathon hard deadline — MVP must be demo-ready, no time for scope creep
- **Team**: 3 generalists — architecture must allow parallel workstreams (data, backend, frontend)
- **Stack**: Python 3.11 + FastAPI + asyncio, Claude API (claude-sonnet-4-20250514), sentence-transformers (all-MiniLM-L6-v2), faiss-cpu, React + Tailwind CSS
- **Data**: Static pre-seeded JSON only — no external API dependencies in the demo critical path
- **Demo safety**: Every demo beat must work offline; live pricing via SerpAPI is stretch-only (Hours 20-22)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static pre-seeded dataset (20 headphones) | Live scraping (Amazon/Reddit) is a demo-day time bomb — anti-bot measures don't respect deadlines | — Pending |
| faiss-cpu not faiss-gpu | GPU acceleration is immeasurable at 20-vector scale; false claim would unravel in Q&A | — Pending |
| No score blending when conflict > 2.5 | Averaging hides the exact information the trust story depends on | — Pending |
| Bias Detector uses 2 deterministic mechanisms + LLM | One concrete, defensible mechanism beats a claimed general adversarial capability | — Pending |
| Headphones as demo domain | Known real-world spec/review tensions; judges understand the domain; price/comfort/spec signals clearly differentiated | — Pending |
| LLM preference delta extraction (not rule-based) | Natural language to vector delta is more impressive in demo; fallback to no-op on parse failure | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 after initialization*
