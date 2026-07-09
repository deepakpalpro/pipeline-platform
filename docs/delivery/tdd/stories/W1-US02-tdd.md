# W1-US02 TDD Guide — JPA tenant isolation filters

| Field | Value |
|-------|--------|
| **Story** | W1-US02 — JPA tenant filters block cross-tenant reads |
| **Depends on** | W1-US01 |
| **Branch** | `W1-US02` from `wave-1` |
| **Timebox hint** | 1–1.5 days |
| **You will touch** | Hibernate filter / `@TenantOwned`, aspect or listener, `TenantIsolationIT`, dual fixtures `T001`/`T002` |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **Architecture** | §6.1 tenancy isolation |
| **KB (create)** | `docs/delivery/kb/W1-US02-tenant-isolation.md` |

---

## What you are building (plain English)

When tenant **A** is in context, they must **not** read tenant **B**’s rows (connectors, services, etc.). Prove it with a negative integration test.

**Done means:** `TenantIsolationIT.tenantA_cannotReadTenantB` is green. Wave exit is blocked if this is red.

**Out of scope:** Full connector CRUD (can use a minimal tenant-owned entity if connectors not ready — e.g. a `tenant_notes` stub **or** early `connectors` table). Prefer an entity you will keep (service config or connector).

---

## 0. Before you code

```bash
git checkout wave-1 && git pull
git checkout -b W1-US02
docker compose up -d mysql
```

You need two tenants in DB: `T001` and `T002` (extend fixtures).

---

## 1. RED — isolation IT first

### Create `TenantIsolationIT`

Flow:

1. Seed tenant A + B (or use API from US01).
2. Insert a **tenant-owned** row for B (e.g. connector or placeholder entity with `tenant_id=T002`).
3. Set `TenantContext` to **T001**.
4. Call repository/service `findById(bRowId)` or list endpoint.
5. Assert **empty / 404 / AccessDenied** — never return B’s payload.

Also add a positive case: T002 context **can** read B’s row.

```bash
./mvnw -pl pipeline-api test -Dtest=TenantIsolationIT
# FAIL — data leaks or filter missing
```

**Stop.** Red.

---

## 2. GREEN — enable Hibernate tenant filter

Typical approach (pick one and stick to it):

1. Annotate entities with tenant column + enable Hibernate `@Filter` / `@FilterDef`.
2. On each request, enable filter with `TenantContext.getTenantId()`.
3. Or use EclipseLink/Hibernate session event + `WHERE tenant_id = :id` on all queries.

Minimal production surface:

- `@TenantOwned` marker annotation (optional but helps refactor)
- `TenantFilterAspect` or `HandlerInterceptor` after context is set
- Ensure **native queries** also filter (or ban them for owned tables)

```bash
./mvnw -pl pipeline-api test -Dtest=TenantIsolationIT
```

### Checklist

- [ ] Negative + positive cases green
- [ ] Works for at least one owned entity type
- [ ] Document which entities are covered

---

## 3. REFACTOR

- Central registration of filterable entities
- Fail closed: missing `TenantContext` → reject request (401/403), don’t return all rows
- Add unit test for “filter parameter bound”

```bash
./mvnw -pl pipeline-api test -Dtest=TenantIsolationIT,TenantControllerIT
```

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Create resource as T002 | 201 |
| 2 | GET as T001 with same id | 404 |
| 3 | GET as T002 | 200 |

---

## 5. Docs & trackers

- [ ] KB: how isolation works + how to test with two tenants
- [ ] Tracker Done · `U,I,M,KB`
- [ ] TEST_MATRIX W1-US02
- [ ] Note in WAVE_1_TDD: exit criterion linked

---

## 6. Ship

```text
merge → tag W1-US02 → delete → W1-US03
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Filtering only in controller | Bypass via repo = leak; filter at persistence |
| `Optional` returning other tenant’s entity | Must be empty |
| Forgetting to enable filter on new Session | Enable in one interceptor always |
| Admin “list all tenants” using same filter | Separate admin path / role |
| Only testing happy path | Negative test is the story |

---

## Help / escalate

- Security-sensitive: get a senior review on the IT before merge
- If JPA not introduced in US01, do US01 follow-up first — don’t fake isolation in memory only
