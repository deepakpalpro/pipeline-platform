# W0-US05 TDD Guide — Mock-data fixtures + WireMock harness

| Field | Value |
|-------|--------|
| **Story** | W0-US05 — Mock-data factories + WireMock harness |
| **Depends on** | W0-US02 |
| **Branch** | `W0-US05` from `wave-0` |
| **Timebox hint** | 0.5–1 day |
| **You will touch** | fixtures JSON, `TenantFixtures`, WireMock test, `wiremock-jetty12` dep |
| **Stakeholder TDD** | [`../WAVE_0_TDD.md`](../WAVE_0_TDD.md) |
| **AC source** | [`../../waves/WAVE_0.md`](../../waves/WAVE_0.md) § W0-US05 |
| **KB** | [`../../kb/W0-US05-mock-data-wiremock.md`](../../kb/W0-US05-mock-data-wiremock.md) |

---

## What you are building (plain English)

Two small test utilities for later waves:

1. **Fixture loader** — read `t001.json` from classpath → tenant id `T001`
2. **WireMock stub** — fake HTTP server returns `GET /external/ping` → `{"ok":true}`

**No Compose MySQL required** for these tests.

**Done means:** `TenantFixturesTest` and `WireMockHarnessTest` green via `./mvnw -pl pipeline-api test`.

---

## 0. Before you code

```bash
git checkout wave-0 && git pull
git checkout -b W0-US05
```

---

## 1. RED — two failing tests

### A. Fixture test

1. Create JSON (can exist before loader):

`pipeline-api/src/test/resources/fixtures/tenants/t001.json`

```json
{
  "id": "T001",
  "name": "Demo Tenant",
  "slug": "demo",
  "status": "active"
}
```

2. Create `TenantFixturesTest.loadsT001` that loads via a helper and asserts id/slug.  
   If helper missing → compile fail or assertion fail = **red**.

Prefer **classpath** loading (`getResourceAsStream`), not `Path.of("src/test/...")` (breaks when CWD differs).

### B. WireMock test

`WireMockHarnessTest.stub_returnsOk`:

- `@RegisterExtension WireMockExtension` dynamic port
- Stub `GET /external/ping` → 200 JSON `{"ok":true}`
- Call with `HttpClient` to `WIRE_MOCK.baseUrl() + "/external/ping"`
- Assert status + body; verify request

### Run (expect FAIL)

```bash
./mvnw -pl pipeline-api test -Dtest=TenantFixturesTest,WireMockHarnessTest
```

**Stop.** Red.

---

## 2. GREEN — helper + dependency

### Add

1. `TenantFixtures` in `.../support/TenantFixtures.java` — `loadT001()`, `load(relativePath)`, constant `T001`
2. Parent BOM / dep: **`org.wiremock:wiremock-jetty12`** (version managed)  
   - Plain `wiremock` without Jetty 12 often fails on Boot 3.4+ (“Jetty 11 is not present…”)
3. Implement WireMock stub as in the test

### Run

```bash
./mvnw -pl pipeline-api test -Dtest=TenantFixturesTest,WireMockHarnessTest
# SUCCESS
```

### Checklist

- [ ] Both tests green **without** MySQL
- [ ] Fixture IDs deterministic (`T001`)
- [ ] No real network calls to the internet

---

## 3. REFACTOR

- Keep fixture loading in one helper class
- Document in KB how to add `fixtures/<entity>/*.json`
- Optionally run full module tests

```bash
./mvnw -pl pipeline-api test
```

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | `./mvnw -pl pipeline-api test -Dtest=TenantFixturesTest,WireMockHarnessTest` | Green |
| 2 | Skim KB | Clear “how to add a fixture” |

---

## 5. Docs & trackers

- [ ] KB mock-data + WireMock
- [ ] Tracker Done · `U,WM,M,KB`
- [ ] TEST_MATRIX W0-US05 (Unit + WireMock + Manual + KB; Integration n/a)
- [ ] WAVE_0 checklist: fixtures + WireMock checked

---

## 6. Ship

```text
merge → tag W0-US05 → delete → next (often W0-US04)
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| `wiremock` artifact → Jetty fatal error | Use `wiremock-jetty12` |
| Loading fixtures with filesystem `src/test/...` | Use classpath `fixtures/...` |
| Starting Spring Boot for WireMock test | Not needed — pure JUnit + extension |
| Non-deterministic IDs | Keep `T001` / `demo` fixed |
| Committing WireMock recordings of secrets | Only stub public ping JSON |

---

## Reference shape (this repo)

- `TenantFixtures` + `TenantFixturesTest`
- `WireMockHarnessTest`
- `fixtures/tenants/t001.json`
- `wiremock-jetty12` in `pipeline-api/pom.xml`
