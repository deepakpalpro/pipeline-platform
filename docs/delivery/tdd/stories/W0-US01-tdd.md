# W0-US01 TDD Guide — Compose stack + LocalStack healthy

| Field | Value |
|-------|--------|
| **Story** | W0-US01 — Compose stack + LocalStack healthy |
| **Depends on** | — (first Wave 0 story) |
| **Branch** | `W0-US01` from `wave-0` |
| **Timebox hint** | 0.5–1 day |
| **You will touch** | `docker-compose.yml`, `scripts/smoke-*.sh`, README ports |
| **Stakeholder TDD** | [`../WAVE_0_TDD.md`](../WAVE_0_TDD.md) |
| **AC source** | [`../../waves/WAVE_0.md`](../../waves/WAVE_0.md) § W0-US01 |
| **KB** | [`../../kb/W0-US01-local-compose-stack.md`](../../kb/W0-US01-local-compose-stack.md) |

---

## What you are building (plain English)

You are **not** writing Java yet. You make a Docker Compose file so MySQL, RabbitMQ, and LocalStack start on a laptop, plus a small shell script that proves LocalStack S3/SQS work.

**Done means:** `docker compose up -d` brings healthy containers, and `./scripts/smoke-localstack.sh` exits `0`.

---

## 0. Before you code

```bash
git checkout wave-0 && git pull
git checkout -b W0-US01
docker --version   # must work (Docker Desktop / Rancher Desktop / Colima)
```

Install AWS CLI **or** `awslocal` if you do not have them (smoke script uses either).

---

## 1. RED — failing smoke first

### Why red first?

If you write Compose first, you never know whether the smoke script is a real gate. Write the script’s assertions, run it, watch it fail.

### Create

`scripts/smoke-localstack.sh` that:

1. Hits LocalStack health (`/_localstack/health`)
2. Creates/lists an S3 bucket
3. Creates/lists an SQS queue
4. Exits non-zero on any failure (`set -euo pipefail`)

Use env defaults:

- Endpoint: `http://localhost:4567` (host port; see note below)
- Dummy AWS keys: `test` / `test`

### Run (expect FAIL)

```bash
chmod +x scripts/smoke-localstack.sh
./scripts/smoke-localstack.sh
# ERROR: LocalStack did not become healthy …  OR connection refused
```

**Stop.** You have red.

---

## 2. GREEN — Compose that makes smoke pass

### Create `docker-compose.yml` with three services

| Service | Image (example) | Host ports | Healthcheck idea |
|---------|-----------------|------------|------------------|
| `mysql` | `mysql:8.4` | `3306` | `mysqladmin ping` |
| `rabbitmq` | `rabbitmq:3.13-management` | `5672`, `15672` | `rabbitmq-diagnostics ping` |
| `localstack` | LocalStack | **`4567:4566`** | health endpoint |

Suggested MySQL env: DB `pipeline`, user/pass `pipeline` / `pipeline`.

LocalStack: enable `s3,sqs` (and whatever the image needs for those services).

### Run

```bash
docker compose up -d
docker compose ps          # all healthy / running
./scripts/smoke-localstack.sh   # exit 0
```

Optional helper: `scripts/smoke-compose-deps.sh` that pings MySQL/Rabbit.

### Checklist

- [ ] Smoke exits 0
- [ ] RabbitMQ UI loads: http://localhost:15672 (guest/guest or compose user)
- [ ] Re-running smoke does not fail (idempotent create-or-skip)

---

## 3. REFACTOR

- Document ports in README (especially LocalStack **4567** vs container 4566).
- Allow overrides: `LOCALSTACK_HOST_PORT`, `LOCALSTACK_ENDPOINT`.
- Keep smoke idempotent (`head-bucket` / create-if-missing).
- Do **not** add the Spring Boot app container in this story.

```bash
./scripts/smoke-localstack.sh   # still 0
```

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | `docker compose up -d` | Containers healthy |
| 2 | `./scripts/smoke-localstack.sh` | Exit 0 |
| 3 | Open http://localhost:15672 | Management UI loads |

**Teardown:** `docker compose down -v` (wipes volumes — OK for Wave 0).

---

## 5. Docs & trackers (same PR)

- [ ] KB: `docs/delivery/kb/W0-US01-local-compose-stack.md`
- [ ] `WAVE_TRACKER.md` → Done · gate `LS,M,KB`
- [ ] `TEST_MATRIX.md` W0-US01: LocalStack + Manual + KB
- [ ] Mark story Done in `waves/WAVE_0.md`

---

## 6. Ship

```text
push W0-US01 → merge into wave-0 → tag W0-US01 → delete branch → checkout -b W0-US02
```

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Mapping LocalStack as `4566:4566` and clashing with another tool | Prefer host `4567` → container `4566` |
| Smoke assumes `awslocal` only | Fall back to `aws --endpoint-url=...` |
| Forgetting `chmod +x` | Script won’t run |
| Declaring victory when containers “Up” but not healthy | Wait for healthchecks / smoke |
| Adding app code in this story | Out of scope — next story |

---

## Reference shape (what “good” looks like in this repo)

- `docker-compose.yml` — mysql, rabbitmq, localstack
- `scripts/smoke-localstack.sh` — wait + S3 + SQS
- `scripts/smoke-compose-deps.sh` — optional MySQL/Rabbit ping
