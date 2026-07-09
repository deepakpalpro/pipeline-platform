# W2-US07 TDD Guide — Execution status query API

| Field | Value |
|-------|--------|
| **Story** | W2-US07 — Execution status/detail API |
| **Depends on** | W2-US04 |
| **Branch** | `W2-US07` from `wave-2` |
| **Timebox hint** | 0.5–1 day |
| **You will touch** | `GET .../executions` endpoints, read models |
| **Stakeholder TDD** | [`../WAVE_2_TDD.md`](../WAVE_2_TDD.md) |
| **AC source** | [`../../waves/WAVE_2.md`](../../waves/WAVE_2.md) § W2-US07 |
| **Architecture** | §3.1 executions |
| **KB (create)** | `docs/delivery/kb/W2-US07-execution-status.md` |

---

## What you are building

List and get execution detail for a pipeline so operators can see status after `POST .../run`.

**Done means:** `ExecutionStatusIT` returns fixture execution with status; cross-tenant 404.

**Out of scope:** Full per-stage metrics dashboards (Wave 4).

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `ExecutionStatusIT` | `listAndGet_afterRun` | status present |
| `ExecutionStatusIT` | `get_asOtherTenant_404` | isolation |

---

## 2. GREEN

1. Controllers for list/detail under `/api/v1/pipelines/{id}/executions`.
2. Read-only queries; tenant filter via pipeline ownership.
3. Wire to fixture run from US04.

---

## 6. Ship

```text
merge → tag W2-US07 → wave exit prep when all Must Done
```
