<!-- GSD:project-start source:PROJECT.md -->
## Project

**AI Shopping Agent with Auditable Reasoning**

A multi-agent shopping system for noise-cancelling headphones where four specialized agents (Price, Specs, Review, Bias Detector) evaluate products in parallel, an adversarial self-audit attempts to disqualify the top recommendation before it surfaces, and a preference model updates in real time via FAISS vector search. Every recommendation includes a full audit log showing what agents agreed on, where they disagreed, and what the system tried to disprove — framing explainability as a correctness guarantee, not a UI feature.

**Core Value:** Before any recommendation reaches the user, the system tried to disqualify it and couldn't — this adversarial self-audit is what separates the system from transparency theater built on corrupted data.

### Constraints

- **Timeline**: 24-hour hackathon hard deadline — MVP must be demo-ready, no time for scope creep
- **Team**: 3 generalists — architecture must allow parallel workstreams (data, backend, frontend)
- **Stack**: Python 3.11 + FastAPI + asyncio, Claude API (claude-sonnet-4-20250514), sentence-transformers (all-MiniLM-L6-v2), faiss-cpu, React + Tailwind CSS
- **Data**: Static pre-seeded JSON only — no external API dependencies in the demo critical path
- **Demo safety**: Every demo beat must work offline; live pricing via SerpAPI is stretch-only (Hours 20-22)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
