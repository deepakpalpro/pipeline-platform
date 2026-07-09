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

## 0. Before you code

```bash
git checkout wave-2 && git pull
git checkout -b W2-US07
docker compose up -d mysql rabbitmq
```

APIs (architecture §3.1):

| Method | Path |
|--------|------|
| `GET` | `/api/v1/pipelines/{id}/executions` |
| `GET` | `/api/v1/pipelines/{id}/executions/{executionId}` |

US04 may already expose get-by-id — extend with **list** and harden isolation.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `ExecutionStatusIT` | `listAndGet_afterRun` | status present |
| `ExecutionStatusIT` | `get_asOtherTenant_404` | isolation |

```bash
./mvnw -pl pipeline-api test -Dtest=ExecutionStatusIT
```

**Stop.** Red.

---

## 2. GREEN

1. Controllers for list/detail under `/api/v1/pipelines/{id}/executions`.
2. Read-only queries; tenant filter via pipeline ownership.
3. Wire to fixture run from US04 (create → steps → activate → run → list/get).

```bash
./mvnw -pl pipeline-api test -Dtest=ExecutionStatusIT,PipelineRunIT
```

### Checklist

- [ ] List ordered by `started_at` desc (or documented order)
- [ ] Cross-tenant list/get → 404
- [ ] Response fields: `id`, `status`, `pipeline_id`, timestamps

---

## 3. REFACTOR

- Keep read models separate from orchestrator write path
- Reuse `PipelineExecutionResponse` from US04 if present
- Avoid embedding stage metrics (Wave 4)

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Run a pipeline | 202 |
| 2 | `GET .../executions` | includes new execution |
| 3 | `GET .../executions/{id}` | status matches |
| 4 | Same URLs as other tenant | 404 |

---

## 5. Docs & trackers

- [ ] KB: list/get examples + isolation
- [ ] Tracker · TEST_MATRIX
- [ ] Mark Done in `WAVE_2.md`; prepare wave exit / PR `wave-2` → `master`

---

## 6. Ship

```text
merge → tag W2-US07 → wave exit prep when all Must Done
```

---

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Listing all tenants’ executions | Filter by pipeline + tenant |
| Returning 200 for foreign pipeline id | 404 like other tenant APIs |
| Blocking on incomplete run in IT | Awaitility with bound timeout |
