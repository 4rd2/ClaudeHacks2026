---
phase: 2
slug: core-agents
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `python -m pytest backend/tests/test_agents.py -q --tb=short` |
| **Full suite command** | `python -m pytest backend/tests/ -q --tb=short` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest backend/tests/test_agents.py -q --tb=short`
- **After every plan wave:** Run `python -m pytest backend/tests/ -q --tb=short`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 2-01-01 | 01 | 1 | AGENTS-01 | unit | `python -m pytest backend/tests/test_agents.py::test_price_agent -q` | ⬜ pending |
| 2-01-02 | 01 | 1 | AGENTS-02 | unit | `python -m pytest backend/tests/test_agents.py::test_specs_agent -q` | ⬜ pending |
| 2-01-03 | 01 | 1 | AGENTS-03 | unit | `python -m pytest backend/tests/test_agents.py::test_review_agent -q` | ⬜ pending |
| 2-02-01 | 02 | 2 | AGENTS-05, CONFLICT-01 | integration | `python -m pytest backend/tests/test_orchestrator.py::test_parallel_execution -q` | ⬜ pending |
| 2-02-02 | 02 | 2 | CONFLICT-02, CONFLICT-03 | integration | `python -m pytest backend/tests/test_orchestrator.py::test_conflict_detection -q` | ⬜ pending |
| 2-02-03 | 02 | 2 | AUDIT-01, AUDIT-02, AUDIT-03 | integration | `python -m pytest backend/tests/test_orchestrator.py::test_audit_gate -q` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/__init__.py` — package init
- [ ] `backend/tests/test_agents.py` — stubs for AGENTS-01, AGENTS-02, AGENTS-03
- [ ] `backend/tests/test_orchestrator.py` — stubs for AGENTS-05, CONFLICT-01..04, AUDIT-01..04
- [ ] `backend/tests/conftest.py` — shared TEST_PRODUCT fixture

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bias detector returns merged flags from both deterministic + LLM adversarial | AUDIT-01, AUDIT-04 | bias_detector.py owned by Person B, not available yet | Run `curl -X POST http://localhost:8000/recommend -d '{"message":"test"}'` and inspect `bias_detector` agent_result in response after B pushes |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
