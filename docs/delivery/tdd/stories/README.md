# Story TDD guides (developers)

Step-by-step **Red → Green → Refactor** playbooks for juniors implementing a user story.

**Template:** [`TDD_STORY_TEMPLATE.md`](TDD_STORY_TEMPLATE.md)

Not the same as wave-level stakeholder TDD ([`../README.md`](../README.md)) or support KB ([`../../kb/`](../../kb/)).

## Wave 0

| Story | Guide | Status |
|-------|-------|--------|
| W0-US01 Compose + LocalStack | [`W0-US01-tdd.md`](W0-US01-tdd.md) | Done (retro guide) |
| W0-US02 Health + MySQL IT | [`W0-US02-tdd.md`](W0-US02-tdd.md) | Done (retro guide) |
| W0-US03 Flyway baseline | [`W0-US03-tdd.md`](W0-US03-tdd.md) | Done (retro guide) |
| W0-US04 Logging + Prometheus | [`W0-US04-tdd.md`](W0-US04-tdd.md) | Done (retro guide) |
| W0-US05 Fixtures + WireMock | [`W0-US05-tdd.md`](W0-US05-tdd.md) | Done (retro guide) |

**Suggested order:** US01 → US02 → US03 → US05 → US04 (matches [`../../waves/WAVE_0.md`](../../waves/WAVE_0.md) delivery sequence).

## Later waves

When pulling a story, copy [`TDD_STORY_TEMPLATE.md`](TDD_STORY_TEMPLATE.md) to `W#-US##-tdd.md` and fill Red/Green/Refactor **before** coding. Link it from the wave execution plan and stakeholder `WAVE_N_TDD.md`.
