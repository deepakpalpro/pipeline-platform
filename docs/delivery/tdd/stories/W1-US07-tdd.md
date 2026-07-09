# W1-US07 TDD Guide — Storage connector vs LocalStack S3

| Field | Value |
|-------|--------|
| **Story** | W1-US07 — Storage connector put/get against LocalStack S3 |
| **Depends on** | W1-US05; W0-US01 LocalStack |
| **Branch** | `W1-US07` from `wave-1` |
| **Timebox hint** | 1–1.5 days |
| **You will touch** | `StorageConnector`, AWS SDK S3 client config, LocalStack endpoint, IT |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **Architecture** | §9.5 `storage` / S3; §10.6 LocalStack |
| **KB (create)** | `docs/delivery/kb/W1-US07-storage-localstack.md` |

---

## What you are building (plain English)

A **Storage** connector plugin that can **put** an object and **get** it back using LocalStack S3 (not real AWS).

**Done means:** `StorageConnectorIT.putGet_roundTrip` green against Compose LocalStack.

---

## 0. Before you code

```bash
git checkout wave-1 && git pull
git checkout -b W1-US07
docker compose up -d localstack
./scripts/smoke-localstack.sh   # must already pass from W0
```

Endpoint default in this repo: `http://localhost:4567` (host) → container `4566`.  
Creds: `test` / `test`, region `us-east-1`.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `StorageConnectorIT` | `putGet_roundTrip` | put bytes; get same bytes; optional `testConnection` lists/buckets |
| `StorageConnectorTest` | `getType_isStorage` | `"storage"` |

IT should **assume** LocalStack up (like MySQL `assumeTrue`) or fail clearly.

```bash
./mvnw -pl pipeline-api test -Dtest=StorageConnectorIT,StorageConnectorTest
```

**Stop.** Red.

---

## 2. GREEN

1. Implement `StorageConnector` implementing SPI (`getType()` → `storage`).
2. Configure AWS SDK v2 S3 client:
   - `endpointOverride(LocalStack URL)`
   - `pathStyleAccess` / force path style as LocalStack needs
   - static credentials test/test
3. `write` → putObject; `read` → getObject; `testConnection` → head bucket or list.
4. Register in connector registry + optional `connector_types` seed.
5. Connector config JSON: `bucket`, `endpoint`, `region`.

```bash
./mvnw -pl pipeline-api test -Dtest=StorageConnectorIT
```

### Checklist

- [ ] Uses LocalStack endpoint, not `s3.amazonaws.com`
- [ ] Idempotent test bucket (create if missing)
- [ ] Registered in SPI loader test (extend US05 test or new)

---

## 3. REFACTOR

- Shared `LocalStackS3ClientFactory` for reuse
- Align env vars with smoke script (`LOCALSTACK_ENDPOINT`)
- Keep credentials out of logs

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | `./scripts/smoke-localstack.sh` | Exit 0 |
| 2 | Run IT | Green |
| 3 | Optional: `awslocal s3 ls` | See test objects |

---

## 5. Docs & trackers

- [ ] KB: LocalStack endpoint + sample connector config
- [ ] Tracker Done · `U,I,LS,M,KB`
- [ ] TEST_MATRIX LocalStack `x`

---

## 6. Ship

```text
merge → tag W1-US07 → W1-US08 (Should) or wave exit prep
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Hitting real AWS | Wrong endpoint / missing override |
| Port 4566 on host | This project uses **4567** by default |
| Signature / path-style errors | Enable path-style for LocalStack |
| Flaky first call | Wait for LocalStack health like smoke script |
| Skipping `assumeTrue` | Breaks CI machines without Docker |

---

## Help / escalate

- W0-US01 smoke script + KB
- AWS SDK LocalStack docs for path style
