# W1-US01 TDD Guide — Tenant CRUD + JWT tenant context

| Field | Value |
|-------|--------|
| **Story** | W1-US01 — Tenant CRUD + JWT/`tenant_id` request context |
| **Depends on** | Wave 0 complete (`wave-0` merged or branched as `wave-1`) |
| **Branch** | `W1-US01` from `wave-1` |
| **Timebox hint** | 1–2 days |
| **You will touch** | Flyway `V2__…`, Tenant entity/repo/service/controller, `TenantContext`, security filter stub, fixtures `T001` |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **Architecture** | [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md) §2.2 `tenants`, §3 APIs, §6.1 |
| **KB (create)** | `docs/delivery/kb/W1-US01-tenant-crud-context.md` |

---

## What you are building (plain English)

1. REST APIs to **create / read / update / list** tenants (aligned with `tenants` table).
2. Every authenticated request carries a **`tenant_id`** in a request-scoped `TenantContext` (from a JWT claim or stub header for local/dev).

**Done means:** Unit tests for validation + context; IT creates a tenant in MySQL and a follow-up request sees the same `tenant_id` in context. No cross-tenant filter yet (that is W1-US02).

**Out of scope:** Full IdP, connector APIs, pipeline APIs.

---

## 0. Before you code

```bash
git checkout wave-1 && git pull   # or create wave-1 from wave-0 if needed
git checkout -b W1-US01
docker compose up -d mysql
```

Reuse W0: Flyway, `local` profile, `TenantFixtures.T001`, Compose MySQL + `assumeTrue`.

**API sketch (adjust to `/api/v1`):**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/tenants` | Create |
| `GET` | `/api/v1/tenants/{id}` | Get |
| `GET` | `/api/v1/tenants` | List (platform/admin for now OK) |
| `PUT` | `/api/v1/tenants/{id}` | Update |

---

## 1. RED — failing tests first

### Unit

| File | Method | Asserts |
|------|--------|---------|
| `TenantServiceTest` | `create_rejectsBlankSlug` | validation error |
| `TenantServiceTest` | `create_persistsAndReturnsId` | mock repo save called |
| `TenantContextTest` | `holdsTenantIdForCurrentThreadOrRequest` | set/get/clear |

### Integration

| File | Method | Asserts |
|------|--------|---------|
| `TenantControllerIT` | `createAndGet_roundTrip` | POST → 201; GET → same slug/name |
| `TenantControllerIT` | `request_populatesTenantContext` | after auth stub, context has tenant id |

JWT for Wave 1: **stub is OK** — e.g. filter reads `Authorization: Bearer test` or header `X-Tenant-Id` in `local`/`test` only. Document that real JWT comes later.

### Run (expect FAIL)

```bash
./mvnw -pl pipeline-api test -Dtest=TenantServiceTest,TenantContextTest,TenantControllerIT
```

**Stop** when you see red (missing classes / failing asserts).

---

## 2. GREEN — smallest slice

1. Migration if needed: extend beyond W0 stub only if columns missing (prefer `V2__…` — **do not edit** applied `V1__`).
2. JPA `Tenant` entity + repository (or JdbcTemplate if you defer JPA — but US02 needs JPA filters, so **prefer JPA now**).
3. `TenantService` + `TenantController`.
4. `TenantContext` (ThreadLocal or request attribute) + filter/interceptor that sets it from stub token/header.
5. Seed/fixture helper for IT using `T001`.

```bash
./mvnw -pl pipeline-api test -Dtest=TenantServiceTest,TenantContextTest,TenantControllerIT
```

Manual:

```bash
# create tenant, then GET with stub header/token
curl -s -X POST localhost:8080/api/v1/tenants -H 'Content-Type: application/json' \
  -d '{"name":"Demo","slug":"demo","status":"trial"}'
```

### Checklist

- [ ] Tests green with MySQL up
- [ ] Slug unique constraint enforced
- [ ] No secrets in logs
- [ ] Stub auth clearly marked `local`/`test` only

---

## 3. REFACTOR

- Single place to read `TenantContext.getTenantId()`
- Map API DTOs ≠ entity if needed
- Align JSON field names with architecture

```bash
./mvnw -pl pipeline-api test -Dtest=TenantServiceTest,TenantControllerIT
```

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | POST tenant | 201 + id |
| 2 | GET by id | Same payload |
| 3 | Duplicate slug | 409/400 |

---

## 5. Docs & trackers

- [ ] KB: how to create a tenant locally + stub auth header
- [ ] `WAVE_TRACKER` W1-US01 → Done · `U,I,M,KB`
- [ ] `TEST_MATRIX` W1-US01
- [ ] Update this guide’s “Reference shape” when code lands

---

## 6. Ship

```text
merge → tag W1-US01 → delete → W1-US02 (isolation next — do not skip)
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Editing `V1__baseline.sql` | Add `V2__…` |
| Putting tenant id only in controller method args | Use request-scoped `TenantContext` |
| Real OAuth rabbit hole | Stub filter; ticket IdP later |
| Skipping IT “because unit passed” | Persistence bugs hide in mocks |
| Returning other tenants’ data in list | Fine for admin list now; US02 hardens owned resources |

---

## Reference shape (this repo)

- `com.pipelineplatform.api.tenant.Tenant` + `TenantRepository` (JPA)
- `TenantService` / `TenantController` (`/api/v1/tenants`)
- `TenantContext` + `TenantContextFilter` (`X-Tenant-Id` stub)
- Tests: `TenantContextTest`, `TenantServiceTest`, `TenantControllerIT`
- KB: [`../../kb/W1-US01-tenant-crud-context.md`](../../kb/W1-US01-tenant-crud-context.md)

---

## Help / escalate

- Architecture §2.2 tenants table
- Pair on security filter design early
- Wave 0 health IT pattern for Compose MySQL
