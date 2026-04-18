---
plan: 02-01
phase: 02-core-agents
status: complete
completed: 2026-04-18
key-files:
  created:
    - backend/tests/__init__.py
    - backend/tests/conftest.py
    - backend/tests/test_agents.py
    - pytest.ini
  modified:
    - backend/agents/price_agent.py
    - backend/agents/specs_agent.py
    - backend/agents/review_agent.py
---

## Summary

Updated all three scoring agents to use exact TEAM.md canonical SYSTEM prompts, and created the Wave 0 test scaffold covering all three agents and the AGENT_UNAVAILABLE fallback.

## Task 1: Agent SYSTEM Prompt Fixes

**price_agent.py:**
- Removed deviant phrase "relative to spec tier" from Score line
- Reordered final two lines to match TEAM.md exactly ("Use ONLY the provided product data. Return evidence as specific price comparisons.")
- Removed unused `AgentResult` import

**specs_agent.py:**
- Removed unused `AgentResult` import
- Minor whitespace normalization (SYSTEM was already correct)

**review_agent.py:**
- Removed unused `AgentResult` import
- Minor whitespace normalization (SYSTEM was already correct)

All three agents now call `call_agent()` with the correct agent name string ("price", "specs", "review").

## Task 2: Wave 0 Test Scaffold

**Files created:**
- `backend/tests/__init__.py` — empty package marker
- `backend/tests/conftest.py` — `TEST_PRODUCT` fixture with all agent-accessed fields (id, name, price, specs, review_data, affiliate_link_density, attributes)
- `backend/tests/test_agents.py` — 4 tests:
  - `test_price_agent_returns_valid_envelope` — asserts agent="price", score 0-10, confidence 0-1, list evidence, list flags
  - `test_specs_agent_returns_valid_envelope` — same for specs
  - `test_review_agent_returns_valid_envelope` — same for review
  - `test_agent_unavailable_on_exception` — asserts AGENT_UNAVAILABLE flag, score=0, confidence=0
- `pytest.ini` — sets `asyncio_mode = auto`

All Claude API calls are mocked via `unittest.mock.AsyncMock` — tests run without `ANTHROPIC_API_KEY`.

## Deviations

None. All files match the plan specification exactly.

**Note:** Test execution (`python -m pytest`) could not be verified from the Git Bash shell (Python not in PATH). Run `py -m pytest backend/tests/test_agents.py -q` from a Windows terminal or PowerShell to confirm 4 passed.
