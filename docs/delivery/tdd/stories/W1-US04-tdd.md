# W1-US04 TDD Guide — Tenant service config (Auth pattern)

| Field | Value |
|-------|--------|
| **Story** | W1-US04 — Tenant service config (Auth vendor pattern) |
| **Depends on** | W1-US03 |
| **Branch** | `W1-US04` from `wave-1` |
| **Timebox hint** | 1–1.5 days |
| **You will touch** | tenant service table, merge defaults+overrides, redaction, CRUD APIs |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **AC source** | [`../../waves/WAVE_1.md`](../../waves/WAVE_1.md) § W1-US04 |
| **Architecture** | §3.4, §9.3 `ServiceResolver` |
| **KB (create)** | `docs/delivery/kb/W1-US04-tenant-service-config.md` |

---

## What you are building (plain English)

Each tenant can save **Auth-like service config** (API keys, issuer URL, etc.). Responses must **never echo secrets**. Defaults from US03 merge when `inherits_default` is true.

**Done means:** Unit tests for merge + redaction; IT CRUD under tenant context; optional WireMock IdP stub left for later if not needed yet.

**Out of scope:** Full OAuth login UI; webhook HMAC verify (W3-US02 uses this config later).

---

## 0. Before you code

```bash
git checkout wave-1 && git pull
git checkout -b W1-US04
docker compose up -d mysql
```

APIs (architecture):

| Method | Path |
|--------|------|
| `GET` | `/api/v1/services` |
| `POST` | `/api/v1/services` |
| `PUT` | `/api/v1/services/{id}` |
| `DELETE` | `/api/v1/services/{id}` |

All scoped by `TenantContext` (US01/US02).

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `TenantServiceConfigServiceTest` | `merge_inheritsDefault` | override wins; missing keys from default |
| `TenantServiceConfigServiceTest` | `toResponse_redactsSecrets` | `client_secret` → `***` / omitted |
| `TenantServiceConfigIT` | `createAndGet_asTenant` | POST then GET; secret not in JSON body |

```bash
./mvnw -pl pipeline-api test -Dtest=TenantServiceConfigServiceTest,TenantServiceConfigIT
```

**Stop.** Red.

---

## 2. GREEN

1. Migration for tenant service config table (per architecture).
2. Service implementing merge (`ServiceResolver`-shaped helper OK).
3. Controller with tenant filter (US02).
4. Encryption-at-rest can be **stub** (prefix `encrypted:`) if full crypto deferred — document it; never log raw secret.

```bash
./mvnw -pl pipeline-api test -Dtest=TenantServiceConfigServiceTest,TenantServiceConfigIT
```

### Checklist

- [ ] Cross-tenant GET returns 404 (reuse isolation)
- [ ] Response redaction covered by unit test
- [ ] No secret in application logs (spot-check)

---

## 3. REFACTOR

- Extract `SecretRedactor`
- Align JSON schema with service type `config_schema`
- Prepare for W3 signature verifier to call `ServiceResolver`

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | POST service with secret field | 201 |
| 2 | GET service | secret redacted |
| 3 | GET as other tenant | 404 |

---

## 5. Docs & trackers

- [ ] KB: Auth config fields + redaction rules
- [ ] Tracker · TEST_MATRIX (WireMock n/a or optional)
- [ ] Note crypto stub if used

---

## 6. Ship

```text
merge → tag W1-US04 → W1-US05 (connectors) or parallel US05 if staffed
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Returning same JSON you persisted | Map to response DTO with redaction |
| Logging `config.toString()` | Structured log without secret keys |
| Skipping tenant filter on services table | US02 must apply |
| Over-building OAuth | Store config only |

---

## Help / escalate

- Architecture §9.3 ServiceResolver
- Security review on redaction
