# W1-US06 TDD Guide — Connector test vs WireMock

| Field | Value |
|-------|--------|
| **Story** | W1-US06 — `POST /connectors/{id}/test` against WireMock |
| **Depends on** | W1-US05; W0-US05 WireMock pattern; W1-US01/02 for tenant-owned connector rows |
| **Branch** | `W1-US06` from `wave-1` |
| **Timebox hint** | 1 day |
| **You will touch** | connector CRUD (minimal), `POST .../test`, RestConnector HTTP call, WireMock IT |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **Architecture** | §3.3 Test Connection response shape |
| **KB (create)** | `docs/delivery/kb/W1-US06-connector-test-wiremock.md` |

---

## What you are building (plain English)

Create a Rest connector instance pointing at WireMock’s base URL. Call **`POST /api/v1/connectors/{id}/test`**. Platform should hit WireMock (reuse `/external/ping` → `{"ok":true}`) and return success JSON with latency.

**Done means:** `RestConnectorTestIT` green with WireMock; response matches architecture success shape.

---

## 0. Before you code

```bash
git checkout wave-1 && git pull
git checkout -b W1-US06
docker compose up -d mysql
```

Reuse W0:

```text
GET /external/ping → 200 {"ok":true}
```

You need connector persistence (Flyway `connectors` table) if not done in US05.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `RestConnectorTestIT` | `test_returnsSuccess_againstWireMock` | POST test → `success: true`; WireMock got `/external/ping` |
| `RestConnectorTest` (unit) | `testConnection_mapsHttpFailure` | 500 → success false |

IT setup pattern:

1. Start `WireMockExtension` dynamic port.
2. Stub ping.
3. Insert connector config `baseUrl = wireMock.baseUrl()`, path `/external/ping`.
4. Call API or service `testConnection`.

```bash
./mvnw -pl pipeline-api test -Dtest=RestConnectorTestIT,RestConnectorTest
```

**Stop.** Red.

---

## 2. GREEN

1. RestConnector uses `HttpClient`/`RestClient` to GET/POST ping URL from config.
2. Controller endpoint `POST /connectors/{id}/test` loads connector for **current tenant**, calls SPI `testConnection()`.
3. Map to:

```json
{
  "success": true,
  "latency_ms": 142,
  "message": "Connection successful",
  "tested_at": "..."
}
```

```bash
./mvnw -pl pipeline-api test -Dtest=RestConnectorTestIT
```

### Checklist

- [ ] Tenant B cannot test tenant A’s connector (404)
- [ ] WireMock verify request happened
- [ ] No real internet calls

---

## 3. REFACTOR

- Share ping path constant with W0 harness docs
- Extract URL join helper
- Timeout config for test calls

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Run IT | Green |
| 2 | Optional: manual WireMock + curl test endpoint | `success: true` |

---

## 5. Docs & trackers

- [ ] KB: how to point Rest connector at WireMock locally
- [ ] Tracker Done · `U,I,WM,M,KB`
- [ ] TEST_MATRIX WireMock column `x`

---

## 6. Ship

```text
merge → tag W1-US06 → W1-US07
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Hard-coding `localhost:8080` for WireMock | Use `WIRE_MOCK.baseUrl()` |
| Forgetting tenant filter on connector get | Isolation bug |
| Treating WireMock as Spring Boot app | JUnit extension only |
| Asserting only HTTP 200 from API without body | Check `success` field |

---

## Help / escalate

- W0-US05 junior guide for WireMock setup
- Architecture §3.3 response contract
