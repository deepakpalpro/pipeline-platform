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

## Wave 1

| Story | Guide | Status |
|-------|-------|--------|
| W1-US01 Tenant CRUD + context | [`W1-US01-tdd.md`](W1-US01-tdd.md) | Done (first impl on `W1-US01`) |
| W1-US02 Tenant isolation filters | [`W1-US02-tdd.md`](W1-US02-tdd.md) | Done (impl on `W1-US02`) |
| W1-US03 Service types + defaults | [`W1-US03-tdd.md`](W1-US03-tdd.md) | Done (impl on `W1-US03`) |
| W1-US04 Tenant service config | [`W1-US04-tdd.md`](W1-US04-tdd.md) | Draft (planning) |
| W1-US05 Connector SPI + Rest | [`W1-US05-tdd.md`](W1-US05-tdd.md) | Draft (planning) |
| W1-US06 Connector test WireMock | [`W1-US06-tdd.md`](W1-US06-tdd.md) | Draft (planning) |
| W1-US07 Storage LocalStack S3 | [`W1-US07-tdd.md`](W1-US07-tdd.md) | Draft (planning) |
| W1-US08 MessageBus LocalStack SQS | [`W1-US08-tdd.md`](W1-US08-tdd.md) | Draft (Should) |

**Suggested order:** US01 → US02 → US03 → US04 → US05 → US06 → US07 → US08.  
US05 can start after W0-US05 even while US03/US04 are in flight if staffing allows — but **do not skip US02** before tenant-owned connector APIs.

Stakeholder wave TDD: [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md).

## Later waves (W2+)

When pulling a story, copy [`TDD_STORY_TEMPLATE.md`](TDD_STORY_TEMPLATE.md) to `W#-US##-tdd.md` and fill Red/Green/Refactor **before** coding. Link it from the wave execution plan and stakeholder `WAVE_N_TDD.md`. Use Wave 0–1 guides as the pattern.
