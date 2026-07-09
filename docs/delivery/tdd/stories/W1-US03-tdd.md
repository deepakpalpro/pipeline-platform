# W1-US03 TDD Guide — Service types + platform defaults

| Field | Value |
|-------|--------|
| **Story** | W1-US03 — Service types + platform default configs |
| **Depends on** | W1-US01 |
| **Branch** | `W1-US03` from `wave-1` |
| **Timebox hint** | 0.5–1 day |
| **You will touch** | `service_types` / defaults migration, seed data, `GET /service-types`, fixtures |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **Architecture** | §2 services tables, §3.4 Service Endpoints |
| **KB (create)** | `docs/delivery/kb/W1-US03-service-types.md` |

---

## What you are building (plain English)

Platform catalog of **service types** (e.g. Auth vendors) plus **default configs** that tenants can inherit later (US04).

**Done means:** `GET /api/v1/service-types` returns seeded types; repository/IT proves defaults load from DB or classpath fixtures.

**Out of scope:** Per-tenant overrides (US04), real Auth vendor calls.

---

## 0. Before you code

```bash
git checkout wave-1 && git pull
git checkout -b W1-US03
docker compose up -d mysql
```

Read architecture for `service_types` / default config shape. Start with **one** type: `AUTH` + vendor `stub` or `okta`-like placeholder.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `ServiceTypeRepositoryTest` or `ServiceTypeServiceTest` | `findAll_containsAuth` | Auth type present after seed |
| `ServiceTypeControllerIT` | `list_returnsCatalog` | GET → 200; body has type id + vendor |

Optional: fixture JSON under `fixtures/services/auth-default.json`.

```bash
./mvnw -pl pipeline-api test -Dtest=ServiceTypeServiceTest,ServiceTypeControllerIT
```

**Stop.** Red.

---

## 2. GREEN

1. Flyway `V#__service_types.sql` (tables + seed INSERT) **or** `ApplicationRunner` seed from fixtures (prefer Flyway for defaults).
2. Entity/repo/service/controller for catalog read APIs.
3. Keep write/admin register out of scope unless AC demands it.

```bash
./mvnw -pl pipeline-api test -Dtest=ServiceTypeServiceTest,ServiceTypeControllerIT
```

Manual:

```bash
curl -s localhost:8080/api/v1/service-types | jq .
```

### Checklist

- [ ] At least one Auth-like type seeded
- [ ] Deterministic IDs in seed/fixtures
- [ ] Tenant isolation N/A for global catalog (document that)

---

## 3. REFACTOR

- Fixture-driven seed so Wave 3 signature stories can reuse Auth type
- Clear DTO: type, vendor, `config_schema`, `default_config`

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | GET `/service-types` | Non-empty catalog |
| 2 | Restart app | Seed idempotent (no duplicate key errors) |

---

## 5. Docs & trackers

- [ ] KB: what a service type is vs tenant service config
- [ ] Tracker + TEST_MATRIX
- [ ] Link from US04 guide

---

## 6. Ship

```text
merge → tag W1-US03 → W1-US04
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Hard-coding catalog only in Java | Prefer DB seed for ops visibility |
| Non-idempotent seed on every boot | Use Flyway or upsert |
| Mixing tenant secrets into defaults | Defaults are platform-wide, non-secret or placeholder |
| Building full OAuth | Stub vendor config schema only |

---

## Help / escalate

- Architecture §3.4
- Align naming with US04 before merge
