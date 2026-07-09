# W2-US01 TDD Guide — Pipeline CRUD + visibility/mode

| Field | Value |
|-------|--------|
| **Story** | W2-US01 — Pipeline CRUD (`visibility`, `execution_mode`) |
| **Depends on** | Wave 1 complete |
| **Branch** | `W2-US01` from `wave-2` |
| **Timebox hint** | 1–1.5 days |
| **You will touch** | Flyway `pipelines` table, entity/repo/service/controller, tenant filter |
| **Stakeholder TDD** | [`../WAVE_2_TDD.md`](../WAVE_2_TDD.md) |
| **AC source** | [`../../waves/WAVE_2.md`](../../waves/WAVE_2.md) § W2-US01 |
| **Architecture** | §2 `pipelines`, §3.1 |
| **KB (create)** | `docs/delivery/kb/W2-US01-pipeline-crud.md` |

---

## What you are building (plain English)

REST APIs to **create / list / get / update / archive** pipelines for the current tenant. Each pipeline has `visibility` (`public`/`private`) and `execution_mode` (`async`/`sync`).

**Done means:** `PipelineControllerIT` green; cross-tenant GET → 404.

**Out of scope:** Steps, run, executions.

---

## 0. Before you code

```bash
git checkout wave-2 && git pull
git checkout -b W2-US01
docker compose up -d mysql
```

APIs: `GET|POST /api/v1/pipelines`, `GET|PUT|DELETE /api/v1/pipelines/{id}` (DELETE = archive).

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `PipelineServiceTest` | `create_defaultsDraftAsyncPrivate` | enums / defaults |
| `PipelineControllerIT` | `createAndGet_asTenant` | 201 then 200 |
| `PipelineControllerIT` | `get_asOtherTenant_returnsNotFound` | 404 |

```bash
./mvnw -pl pipeline-api test -Dtest=PipelineServiceTest,PipelineControllerIT
```

**Stop.** Red.

---

## 2. GREEN

1. Migration for `pipelines` (architecture columns needed for CRUD).
2. `@TenantOwned` + Hibernate filter (reuse US02 pattern; single `@FilterDef`).
3. Controller under `/api/v1/pipelines` with `X-Tenant-Id`.

### Checklist

- [ ] Unique name per tenant
- [ ] Archive sets `status=archived` (or soft-delete convention)
- [ ] Isolation IT

---

## 3. REFACTOR

- Align JSON field names with architecture create response
- Prepare for US02 steps relation (empty list OK)

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | POST pipeline | 201 with id |
| 2 | GET as other tenant | 404 |

---

## 5. Docs & trackers

- [ ] KB · Tracker · TEST_MATRIX
- [ ] Mark Done in `WAVE_2.md`

---

## 6. Ship

```text
merge → tag W2-US01 → delete → W2-US02
```

---

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Missing tenant filter | Same as W1-US02 |
| Hard-deleting rows | Prefer archive status |
| Implementing steps here | Defer to US02 |
