# Pipeline Platform

Multi-tenant, pay-as-you-go data processing platform with a no-code pipeline builder.

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data model, APIs, UI, observability, K8s, webhook ingress (§11) |
| [`docs/DELIVERY_PLAN.md`](docs/DELIVERY_PLAN.md) | Incremental delivery: waves → features → epics → user stories |
| [`SYSTEM_DESIGN_PROMPT.md`](SYSTEM_DESIGN_PROMPT.md) | Reusable LLM system-design prompt |

### Delivery trackers

| Doc | Purpose |
|-----|---------|
| [`docs/delivery/STORY_TEMPLATE.md`](docs/delivery/STORY_TEMPLATE.md) | Mandatory acceptance criteria (TDD, unit/IT, mocks/LocalStack, manual, support KB) |
| [`docs/delivery/WAVE_TRACKER.md`](docs/delivery/WAVE_TRACKER.md) | Per-wave story status |
| [`docs/delivery/TEST_MATRIX.md`](docs/delivery/TEST_MATRIX.md) | Story × test-type coverage |
| [`docs/delivery/SUPPORT_KB_TEMPLATE.md`](docs/delivery/SUPPORT_KB_TEMPLATE.md) | Customer-support knowledge-base article template |

## Stack (target)

Spring Boot · MySQL · RabbitMQ · ELK · Prometheus/Grafana · LocalStack · Docker · Kubernetes

## Getting started

- **Delivery catalog:** [docs/DELIVERY_PLAN.md](docs/DELIVERY_PLAN.md)
- **Wave 0 plan:** [docs/delivery/waves/WAVE_0.md](docs/delivery/waves/WAVE_0.md)

### Local deps (W0-US01)

Requires Docker. AWS CLI v2 (or `awslocal`) is used by the LocalStack smoke script.

| Service | Ports | Credentials |
|---------|-------|-------------|
| MySQL 8 | `3306` | user/pass/db: `pipeline` / `pipeline` / `pipeline` (root: `root`) |
| RabbitMQ | `5672`, management `15672` | `pipeline` / `pipeline` |
| LocalStack | host `4567` → container `4566` | dummy keys `test` / `test`; region `us-east-1` (override host port via `LOCALSTACK_HOST_PORT`) |

```bash
docker compose up -d
./scripts/smoke-compose-deps.sh   # MySQL + RabbitMQ
./scripts/smoke-localstack.sh     # S3 + SQS via LocalStack
docker compose down -v            # teardown
```

Spring Boot health / Flyway / WireMock follow later Wave 0 stories (W0-US02+).
