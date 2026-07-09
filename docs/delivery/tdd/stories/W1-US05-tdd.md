# W1-US05 TDD Guide — Connector SPI load + Rest plugin

| Field | Value |
|-------|--------|
| **Story** | W1-US05 — Connector SPI load + Rest plugin registration |
| **Depends on** | W0-US05 (WireMock harness patterns); ideally W1-US01 for tenant-owned connectors later |
| **Branch** | `W1-US05` from `wave-1` |
| **Timebox hint** | 1–2 days |
| **You will touch** | `Connector` SPI interface, Rest plugin, loader/registry, `connector_types` seed, unit tests |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **Architecture** | §9 Connector SPI (especially §9.1–9.5) |
| **KB (create)** | `docs/delivery/kb/W1-US05-connector-spi.md` |

---

## What you are building (plain English)

A **plugin interface** (`Connector`) and one built-in **`RestConnector`** implementation that the platform can discover/register. You are **not** required to finish `POST /connectors/{id}/test` end-to-end (that is US06) — but `testConnection()` should exist on the SPI.

**Done means:** `ConnectorSpiLoaderTest` proves Rest plugin is registered and `getType()` returns `"rest"`.

**Out of scope:** S3/SQS plugins (US07/US08); full PF4J packaging can be simplified to Spring `@Component` scan for Wave 1 if documented.

---

## 0. Before you code

```bash
git checkout wave-1 && git pull
git checkout -b W1-US05
```

Copy SPI method names from architecture §9.1:

- `getType()`, `getSpiVersion()`, `configure(...)`, `testConnection()`, `read`, `write`, `close`

Junior tip: start with **interfaces + Rest stub** that returns success from `testConnection()` without HTTP; US06 adds real HTTP via WireMock.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `ConnectorSpiLoaderTest` | `loadsRestConnector` | registry contains type `rest` |
| `RestConnectorTest` | `getType_isRest` | `"rest"` |
| `RestConnectorTest` | `testConnection_withoutConfig_failsCleanly` | failed result, not NPE |

```bash
./mvnw -pl pipeline-api test -Dtest=ConnectorSpiLoaderTest,RestConnectorTest
```

**Stop.** Red.

---

## 2. GREEN

1. Package e.g. `com.pipelineplatform.connector.spi` with `Connector`, `ConnectionTestResult`, `ConnectorConfig`, `ConnectorContext`.
2. `RestConnector` implements SPI.
3. `ConnectorRegistry` / loader: Spring beans **or** `ServiceLoader` + `META-INF/services/...`.
4. Optional: Flyway seed row in `connector_types` for `rest`.

```bash
./mvnw -pl pipeline-api test -Dtest=ConnectorSpiLoaderTest,RestConnectorTest
```

### Checklist

- [ ] SPI matches architecture names closely (reviewer will check §9)
- [ ] Rest is registered once at startup
- [ ] No call to real external internet in unit tests

---

## 3. REFACTOR

- Keep SPI free of Spring annotations if possible (easier testing)
- Shared package for future Storage/MessageBus
- Document “Wave 1 uses Spring registration; PF4J later” if you deferred PF4J

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Boot app; log registry | `rest` listed |
| 2 | `GET /connector-types` (if exposed) | includes rest |

---

## 5. Docs & trackers

- [ ] KB: how to add a connector plugin (checklist for juniors)
- [ ] Tracker · TEST_MATRIX (Unit; WireMock n/a until US06)
- [ ] Link US06 as next step

---

## 6. Ship

```text
merge → tag W1-US05 → W1-US06
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Implementing only a class with no registry | Loader test will fail — register it |
| Copy-pasting AWS SDK into Rest plugin | Wrong story |
| Breaking SPI method signatures vs §9 | Align before PR |
| Fat interface with HTTP client in constructor | Inject client; easier to mock |

---

## Help / escalate

- Architecture §9 — source of truth for interface
- Ask before inventing a second SPI
