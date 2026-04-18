# Phase 2: Core Agents - Research

**Researched:** 2026-04-18
**Domain:** Python asyncio multi-agent orchestration, Claude API integration, conflict detection
**Confidence:** HIGH

## Summary

Phase 2 completes the agent layer for the AI Shopping Agent. The scaffold from Phase 1 already contains working stubs for all three scoring agents (price, specs, review) and a partially-implemented orchestrator. The TEAM.md file contains the canonical, authoritative implementation for every file Person A must write — this is not a research-and-decide phase, it is an execute-against-spec phase.

The critical architectural constraint is the team boundary: Person A MUST NOT write `backend/agents/bias_detector.py`. The orchestrator.py already has a graceful import fallback for when bias_detector.py does not yet exist (`ImportError` catch → returns `AGENT_UNAVAILABLE`), which allows Person A's work to be tested independently. The three scoring agents, conflict detection logic, audit gate, and confidence-weighted final score are all Person A's responsibility.

The agents call the Claude API synchronously via `anthropic.Anthropic()`, wrapped in `asyncio.run_in_executor` inside `base.py` so they are awaitable. `asyncio.gather` fans out all four agents in parallel. The 10-second timeout per agent call is already implemented in `base.py` from Phase 1.

**Primary recommendation:** Implement the three scoring agents and validate the orchestrator end-to-end against a hardcoded product dict before Person B's `products.json` is available.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENTS-01 | All 4 agents run concurrently via asyncio.gather per /recommend call | orchestrator.py already uses asyncio.gather; verify timing logs confirm concurrency |
| AGENTS-02 | Price Agent returns AgentResult scoring 0-10 on value vs competitors; flags if price > 30% above equivalent spec tier | price_agent.py stub exists; SYSTEM prompt in TEAM.md is canonical |
| AGENTS-03 | Specs Agent returns AgentResult scoring 0-10 on objective technical specs only; flags if any spec below category average | specs_agent.py stub exists; SYSTEM prompt in TEAM.md is canonical |
| AGENTS-04 | Review Agent returns AgentResult scoring 0-10 based on sentiment (60%) + complaint severity (40%); flags if complaint > 15% | review_agent.py stub exists; SYSTEM prompt in TEAM.md is canonical |
| AGENTS-05 | Bias Detector runs 2 deterministic checks + LLM adversarial attempt; returns merged AgentResult | Person B owns this file — Person A provides the import fallback in orchestrator.py |
| AGENTS-06 | All agents use AgentResult envelope: {agent, score, confidence, evidence[], flags[], audit_note?} | agent_types.py already implements this contract |
| AGENTS-07 | Agent failures return degraded AgentResult with confidence: 0 and flags: ["AGENT_UNAVAILABLE"] — never crash | base.py already implements this in the except block |
| CONFLICT-01 | Conflict fires when max_score - min_score > 2.5 across 3 scoring agents | detect_conflict() in orchestrator.py already implements this exactly |
| CONFLICT-02 | Conflicting scores NOT blended — both values appear side-by-side with agent attribution | detect_conflict() returns description string with agent attribution; ReasoningChain carries full agent_results[] |
| CONFLICT-03 | Clean sweep anomaly when all agent scores > 8.5 with no flags → CLEAN_SWEEP_ANOMALY flag | orchestrator.py already implements this check |
| CONFLICT-04 | Final score is confidence-weighted average of 3 scoring agents (Bias Detector excluded) | orchestrator.py already implements this formula |
| AUDIT-01 | Bias Detector LLM call explicitly attempts to construct a disqualifying case | Person B's bias_detector.py responsibility; system prompt in TEAM.md is canonical |
| AUDIT-02 | audit_passed = true when bias flags empty OR bias detector score < 6 | orchestrator.py: `audit_passed = len(bias.flags) == 0 or bias.score < 6` — already correct |
| AUDIT-03 | Failed adversarial attack (score < 4) reported as positive trust signal | audit_note field on AgentResult carries this signal; orchestrator surfaces it via audit_attempts[] |
| AUDIT-04 | Products with audit_passed = false ranked below audit-passing products (not suppressed) | Sorting logic belongs in main.py (Phase 3); TEAM.md shows `sorted(chains, key=lambda c: (c.audit_passed, c.final_score), reverse=True)` |
</phase_requirements>

## Standard Stack

### Core (already installed per requirements.txt)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anthropic | from requirements.txt | Claude API client | Project-mandated; model claude-sonnet-4-20250514 |
| fastapi | from requirements.txt | ASGI web framework | Project-mandated |
| pydantic | from requirements.txt | Data validation / AgentResult model | Project-mandated |
| asyncio | stdlib | Parallel agent execution | Built-in; asyncio.gather for fan-out |

[ASSUMED] Exact installed versions unknown — requirements.txt has no version pins. This is acceptable for a 24-hour hackathon.

### Architecture: How the Claude API call works
The Anthropic Python SDK `client.messages.create()` is synchronous. `base.py` wraps it with `loop.run_in_executor(None, lambda: ...)` so it runs in a thread pool executor and becomes awaitable. `asyncio.gather` then fans all four agents out concurrently. [VERIFIED: codebase — base.py lines 12-28]

**Installation verification:**
```bash
pip install -r requirements.txt
```

## Architecture Patterns

### Existing Project Structure (Person A's files)
```
backend/
├── __init__.py
├── main.py                    # Phase 1 stub — health only; Phase 3 gets full /recommend
├── agents/
│   ├── __init__.py
│   ├── base.py                # COMPLETE — Claude API wrapper with timeout + fallback
│   ├── price_agent.py         # STUB exists — needs TEAM.md canonical SYSTEM prompt
│   ├── specs_agent.py         # STUB exists — needs TEAM.md canonical SYSTEM prompt
│   ├── review_agent.py        # STUB exists — needs TEAM.md canonical SYSTEM prompt
│   ├── bias_detector.py       # Person B owns — DO NOT TOUCH
│   └── orchestrator.py        # PARTIALLY IMPLEMENTED — conflict detection + audit gate present
└── models/
    ├── __init__.py
    └── agent_types.py         # COMPLETE — AgentResult, ConflictReport, ReasoningChain
```

### Pattern 1: Agent-as-LLM-call with structured JSON output
**What:** Each scoring agent passes a system prompt constraining the agent's role, then calls `call_agent()` which instructs Claude to return ONLY `{score, confidence, evidence, flags}` JSON with no preamble.
**When to use:** Every scoring agent (price, specs, review). Bias Detector adds deterministic checks before/after the LLM call.
**Example (from TEAM.md — canonical source):**
```python
# Source: TEAM.md Phase 2 Tasks — Person A
SYSTEM = """You are a Price Analysis Agent. Score 0-10: 10 = exceptional value, 0 = price gouging.
Flag if price is more than 30% above closest competitor for equivalent specs.
Use ONLY the provided product data. Return evidence as specific price comparisons."""

async def run_price_agent(product, user_query):
    return await call_agent("price", SYSTEM, user_query, product)
```

### Pattern 2: asyncio.gather for parallel agent execution
**What:** `asyncio.gather(*coroutines)` fans out all four agents in parallel. Each agent waits on a thread pool executor for the synchronous Anthropic SDK call.
**When to use:** orchestrator.py `evaluate_product()` function.
**Example (already in orchestrator.py):**
```python
# Source: backend/agents/orchestrator.py (verified in codebase)
results = list(await asyncio.gather(
    run_price_agent(product, user_query),
    run_specs_agent(product, user_query),
    run_review_agent(product, user_query),
    run_bias_detector(product, user_query)
))
```

### Pattern 3: Deferred import for cross-team boundary
**What:** `bias_detector` is imported inside `evaluate_product()` with a try/except fallback so Person A can develop and test without Person B's file being present.
**When to use:** The orchestrator already implements this. Do not change it to a top-level import.
**Example (already in orchestrator.py — do not change):**
```python
# Source: backend/agents/orchestrator.py (verified in codebase)
try:
    from backend.agents.bias_detector import run_bias_detector
except ImportError:
    async def run_bias_detector(p, q):
        return AgentResult(agent="bias_detector", score=0, confidence=0, evidence=[], flags=["AGENT_UNAVAILABLE"])
```

### Pattern 4: Confidence-weighted final score
**What:** Final score uses only the 3 scoring agents (bias_detector excluded). If total_confidence is 0 (all agents failed), return 0.0 to avoid division by zero.
**Example (already in orchestrator.py):**
```python
# Source: backend/agents/orchestrator.py (verified in codebase)
core = [r for r in results if r.agent != "bias_detector"]
total_confidence = sum(r.confidence for r in core)
final_score = sum(r.score * r.confidence for r in core) / total_confidence if total_confidence > 0 else 0.0
```

### Anti-Patterns to Avoid
- **Modifying bias_detector.py:** Person B owns this file. Any change causes merge conflicts.
- **Blending conflicting scores:** CONFLICT-02 explicitly forbids averaging scores when conflict > 2.5. The conflict description must show both values side-by-side.
- **Crashing on agent failure:** All exceptions are caught in `base.py`; never let an agent exception propagate to the orchestrator.
- **Top-level import of bias_detector:** This would break the build when Person B hasn't pushed yet. Keep the deferred import pattern already in orchestrator.py.
- **Changing the AGENT_TIMEOUT:** 10 seconds is already set in base.py. TEAM.md Phase 4 adds this, but it's already done.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallel execution | Custom thread pool or asyncio.Queue | `asyncio.gather` | Already in orchestrator.py; gather propagates results in order |
| Agent fallback | Custom retry logic | try/except in base.py → AGENT_UNAVAILABLE | Already implemented; adds complexity without demo value |
| JSON parsing of LLM output | Regex or string splitting | `json.loads(response.content[0].text)` | Claude is instructed to return valid JSON only |
| Score normalization | Custom scaling | 0-10 scoring directly in system prompts | Claude handles this with the system prompt instruction |
| Conflict resolution | Weighted blending | Side-by-side display in ConflictReport | CONFLICT-02 explicitly forbids blending |

**Key insight:** All critical logic is already scaffolded in the existing stubs. Phase 2 is primarily about filling in the correct SYSTEM prompts and verifying the orchestrator end-to-end.

## Gap Analysis: What Phase 2 Actually Changes

Comparing existing stubs to TEAM.md canonical code:

| File | Current State | Phase 2 Change Required |
|------|--------------|------------------------|
| `price_agent.py` | Stub with slightly different SYSTEM prompt | Update SYSTEM prompt to exact TEAM.md wording |
| `specs_agent.py` | Stub with slightly different SYSTEM prompt | Update SYSTEM prompt to exact TEAM.md wording |
| `review_agent.py` | Stub with slightly different SYSTEM prompt | Update SYSTEM prompt to exact TEAM.md wording |
| `orchestrator.py` | Partially implemented with deferred import fallback, conflict detection, audit gate, confidence-weighted score | Verify completeness against TEAM.md; the stub is already very close to canonical |
| `bias_detector.py` | NOT Person A's file | Leave it alone — the import fallback handles absence |
| `main.py` | Phase 1 health stub only | Phase 2 leaves it as-is; Phase 3 adds /recommend |

[VERIFIED: codebase — read all five files and compared to TEAM.md]

### SYSTEM Prompt Differences (stubs vs TEAM.md canonical)

**price_agent.py:**
- Stub: "Score 0-10: 10 = exceptional value, 0 = price gouging relative to spec tier."
- TEAM.md: "Score 0-10: 10 = exceptional value, 0 = price gouging." (simpler, no "relative to spec tier" in prompt body — the flag instruction already says "equivalent specs")
- Action: Use TEAM.md version exactly

**specs_agent.py:**
- Both versions are functionally equivalent — stub matches TEAM.md closely
- Action: Verify final wording matches TEAM.md

**review_agent.py:**
- Both versions are functionally equivalent — stub matches TEAM.md closely
- Action: Verify final wording matches TEAM.md

## Common Pitfalls

### Pitfall 1: Division by Zero in Final Score
**What goes wrong:** If all 3 scoring agents fail (all confidence = 0), `sum(r.score * r.confidence for r in core) / sum(r.confidence for r in core)` raises `ZeroDivisionError`.
**Why it happens:** AGENT_UNAVAILABLE results return confidence=0.
**How to avoid:** orchestrator.py already has `if total_confidence > 0 else 0.0` guard — verify it's present.
**Warning signs:** Test with a product that forces all agents to fail (invalid JSON product).

### Pitfall 2: bias_detector result not found
**What goes wrong:** `next(r for r in results if r.agent == "bias_detector")` raises `StopIteration` if no result has agent == "bias_detector".
**Why it happens:** If the deferred import fallback function returns with a different agent name.
**How to avoid:** The fallback in orchestrator.py returns `AgentResult(agent="bias_detector", ...)` with the exact name. Never change the agent name string.
**Warning signs:** `StopIteration` traceback from the `next()` call.

### Pitfall 3: asyncio event loop issues
**What goes wrong:** `asyncio.get_event_loop()` in base.py may be deprecated in Python 3.10+ in non-async contexts.
**Why it happens:** base.py uses `loop = asyncio.get_event_loop()` then `loop.run_in_executor`.
**How to avoid:** `call_agent` is always called from within an async context (from the agent run_ functions which are awaited). Inside an async function, `asyncio.get_event_loop()` returns the running loop correctly. This is fine.
**Warning signs:** `DeprecationWarning: There is no current event loop` — only appears if called outside async context.

### Pitfall 4: Testing before products.json exists
**What goes wrong:** Agents need a product dict to pass to Claude. Without products.json, you cannot test with real data.
**Why it happens:** Person B owns products.json (Phase 2 for B).
**How to avoid:** Create a minimal hardcoded test product dict in a test script to validate agents independently before Person B pushes.
**Warning signs:** `FileNotFoundError` when trying to load products.json.

### Pitfall 5: CLEAN_SWEEP_ANOMALY mutating bias.flags
**What goes wrong:** `bias.flags.append(...)` mutates the AgentResult that was already gathered. This is fine functionally but means the object in `results` is also modified (same reference).
**Why it happens:** orchestrator.py appends to `bias.flags` after gather returns.
**How to avoid:** This is intentional — the mutation is visible in the `agent_results` list because it's the same object. The behavior is correct.
**Warning signs:** None — this works as designed.

## Code Examples

### Testing agents without products.json
```python
# Source: derived from existing codebase patterns [ASSUMED]
import asyncio
from backend.agents.price_agent import run_price_agent

TEST_PRODUCT = {
    "id": "test-001",
    "name": "Test Headphone",
    "price": 299,
    "specs": {
        "noise_cancellation": 9.5,
        "sound_quality": 9.2,
        "battery_hours": 30,
        "weight_grams": 250,
        "driver_size_mm": 30
    },
    "review_data": {
        "aggregate_score": 4.6,
        "sentiment_score": 0.71,
        "review_count": 18420,
        "source_distribution": {"amazon": 0.62, "rtings": 0.21, "reddit": 0.17},
        "top_complaints": ["ear cup pressure after 2h"],
        "top_praises": ["best ANC available"]
    },
    "affiliate_link_density": 0.34,
    "attributes": {
        "price_sensitivity": 0.4,
        "sound_quality": 0.92,
        "comfort": 0.61,
        "battery_life": 0.90,
        "portability": 0.72,
        "noise_cancellation": 0.95
    }
}

async def test():
    result = await run_price_agent(TEST_PRODUCT, "find me best noise cancelling headphones")
    print(result.model_dump_json(indent=2))

asyncio.run(test())
```

### Verifying parallel execution via timing
```python
# Source: derived from orchestrator.py patterns [ASSUMED]
import asyncio, time
from backend.agents.orchestrator import evaluate_product

async def test_parallel():
    start = time.time()
    chain = await evaluate_product(TEST_PRODUCT, "test query")
    elapsed = time.time() - start
    print(f"Completed in {elapsed:.2f}s — if parallel, should be ~max(agent_time) not sum")
    print(f"audit_passed: {chain.audit_passed}")
    print(f"final_score: {chain.final_score:.2f}")
    print(f"conflict: {chain.conflict_report.exists}")

asyncio.run(test_parallel())
```

### Triggering conflict detection (score spread > 2.5)
```python
# Source: derived from REQUIREMENTS.md CONFLICT-01 and orchestrator.py [ASSUMED]
# To test: engineer a product where Price agent scores high but Review scores low
# Example: low price (good value) but terrible reviews
CONFLICT_TEST_PRODUCT = {
    **TEST_PRODUCT,
    "price": 49,  # very cheap — Price agent scores 9+
    "review_data": {
        **TEST_PRODUCT["review_data"],
        "aggregate_score": 2.1,
        "sentiment_score": 0.25,
        "top_complaints": ["falls apart", "poor ANC", "terrible sound"]
    }
}
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | All agents | [ASSUMED] yes per CLAUDE.md | 3.11 (required) | — |
| anthropic SDK | base.py | Listed in requirements.txt | Current | — |
| ANTHROPIC_API_KEY | base.py | Must be in .env | — | No fallback — Claude API required |
| fastapi / uvicorn | main.py | Listed in requirements.txt | Current | — |
| bias_detector.py | orchestrator.py | NOT YET (Person B Phase 2) | — | Deferred import fallback returns AGENT_UNAVAILABLE |

**Missing dependencies with no fallback:**
- `ANTHROPIC_API_KEY`: Must be set in `.env` — all Claude API calls fail without it.

**Missing dependencies with fallback:**
- `bias_detector.py`: The deferred import pattern in orchestrator.py handles absence gracefully.
- `products.json`: Test with hardcoded TEST_PRODUCT dict until Person B pushes.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (assumed — not in requirements.txt) or manual asyncio.run scripts |
| Config file | none detected |
| Quick run command | `python -c "import asyncio; from backend.agents.price_agent import run_price_agent; ..."` |
| Full suite command | Manual smoke test via hardcoded product dict |

No test infrastructure exists in the repo. For the 24-hour hackathon context, manual smoke tests via asyncio.run scripts are the pragmatic validation approach.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENTS-01 | 4 agents run concurrently | timing smoke test | `python -c "import asyncio; from backend.agents.orchestrator import evaluate_product; ..."` | ❌ Wave 0 |
| AGENTS-02 | Price agent returns score/confidence/evidence/flags | unit smoke test | `python -c "import asyncio; from backend.agents.price_agent import run_price_agent; ..."` | ❌ Wave 0 |
| AGENTS-03 | Specs agent returns correct fields | unit smoke test | same pattern | ❌ Wave 0 |
| AGENTS-04 | Review agent returns correct fields | unit smoke test | same pattern | ❌ Wave 0 |
| AGENTS-07 | Failed agent returns AGENT_UNAVAILABLE | unit smoke test | force exception in call_agent, verify result | ❌ Wave 0 |
| CONFLICT-01 | Score spread > 2.5 triggers ConflictReport | unit test | orchestrator with mocked agent results | ❌ Wave 0 |
| CONFLICT-03 | CLEAN_SWEEP_ANOMALY flag when all > 8.5 | unit test | orchestrator with mocked high scores | ❌ Wave 0 |
| AUDIT-02 | audit_passed logic | unit test | verify with bias score 3 vs 7 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run smoke test script for the agent just implemented
- **Per wave merge:** Run full evaluate_product() with TEST_PRODUCT dict, verify all fields in ReasoningChain
- **Phase gate:** evaluate_product() returns valid ReasoningChain with 4 agent_results, correct conflict detection, correct audit_passed logic

### Wave 0 Gaps
- [ ] `tests/smoke_agents.py` — covers AGENTS-01 through AGENTS-07 with TEST_PRODUCT
- [ ] `tests/smoke_conflict.py` — covers CONFLICT-01, CONFLICT-03, CONFLICT-04
- [ ] `tests/smoke_audit.py` — covers AUDIT-01 through AUDIT-04

*(Pragmatic alternative: single `tests/smoke_phase2.py` script using asyncio.run — acceptable for 24-hour hackathon)*

## Security Domain

Security enforcement applies. For this phase:

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in this phase |
| V3 Session Management | no | Stateless agent calls |
| V4 Access Control | no | No access control layer |
| V5 Input Validation | yes | Product dict passed to LLM — validate fields exist before passing |
| V6 Cryptography | no | No cryptographic operations |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via product data | Tampering | System prompt instructs "Use ONLY the provided product data"; JSON serialization of product_context prevents injection |
| LLM returns invalid JSON | Tampering | json.loads() wrapped in try/except in base.py → AGENT_UNAVAILABLE fallback |
| API key exposure | Information Disclosure | Key in .env, never hardcoded; .env.example committed, .env in .gitignore |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Python 3.11 and all requirements.txt packages are installed on the machine | Environment Availability | Agents won't run; fix by running `pip install -r requirements.txt` |
| A2 | Exact installed versions of anthropic, fastapi, pydantic are current/compatible | Standard Stack | API breaking changes possible; verify with `pip show anthropic` |
| A3 | ANTHROPIC_API_KEY is configured in .env | Environment Availability | All Claude API calls fail; critical blocker |

## Open Questions (RESOLVED)

1. **Are the existing SYSTEM prompts in price/specs/review stubs sufficient, or must they match TEAM.md exactly?**
   - What we know: The stubs have slightly different wording from TEAM.md
   - What's unclear: Whether the LLM behavior meaningfully differs between the versions
   - RESOLVED: Use TEAM.md wording exactly for consistency and predictability. Plan 02-01 Task 1 implements the canonical prompts verbatim.

2. **Is Person B's products.json available yet?**
   - What we know: Per STATUS TRACKER, Person B's Phase 2 is "Not started" as of 2026-04-18
   - What's unclear: Whether Person B has pushed partial data
   - RESOLVED: Person A implements agents using a hardcoded TEST_PRODUCT dict in conftest.py (Plan 02-01 Task 2). Full pipeline validation does not depend on Person B's data.

3. **Should `audit_passed` use `bias.score < 6` or `bias.score < 4`?**
   - What we know: orchestrator.py uses `< 6` for audit_passed; AUDIT-03 says `< 4` is a "positive trust signal"
   - What's unclear: Whether < 4 is a sub-condition of audit_passed or just an audit_note distinction
   - RESOLVED: These are two separate concepts. AUDIT-02: `audit_passed = True` when bias score < 6. AUDIT-03: score < 4 triggers a positive trust signal in audit_note. The existing orchestrator.py is correct and tested separately in test_audit_passed_logic (Cases A, B, C).

## Sources

### Primary (HIGH confidence)
- TEAM.md (codebase) — canonical implementation spec for all Phase 2 agent code
- `backend/agents/base.py` (codebase) — verified existing timeout and fallback implementation
- `backend/agents/orchestrator.py` (codebase) — verified existing conflict detection and audit logic
- `backend/models/agent_types.py` (codebase) — verified AgentResult contract
- `.planning/REQUIREMENTS.md` (codebase) — verified all requirement IDs and their exact criteria

### Secondary (MEDIUM confidence)
- `requirements.txt` (codebase) — package list without pinned versions
- `CLAUDE.md` (codebase) — project constraints and stack mandate

### Tertiary (LOW confidence)
- None — all findings came from the codebase directly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in requirements.txt and codebase
- Architecture: HIGH — orchestrator.py and base.py are working code, not hypothetical
- Pitfalls: HIGH — derived from reading actual implementation, not speculation
- Gap analysis: HIGH — direct comparison of stubs to TEAM.md canonical code

**Research date:** 2026-04-18
**Valid until:** End of hackathon (24 hours) — no external dependency drift risk; all sources are local codebase
