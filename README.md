# Pipeline Platform

Multi-tenant, pay-as-you-go data processing platform with a no-code pipeline builder.

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data model, APIs, UI, observability, K8s, webhook ingress (§11) |
| [`docs/LOCALDEV_PIPELINE_GUIDE.md`](docs/LOCALDEV_PIPELINE_GUIDE.md) | Localdev + build pipelet images + `local,k8s` Run verification (Inventory → Petstore) |
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
| Prometheus (optional) | `9090` | profile `metrics` — scrapes host `:8080/actuator/prometheus` |
| Grafana (optional) | `3000` | profile `metrics` — login `admin` / `admin` |

```bash
# Full local e2e (Compose + Petstore + API + UI)
./scripts/localdev.sh start --with-metrics
./scripts/localdev.sh status
./scripts/localdev.sh stop

# Or piece-wise:
docker compose up -d
./scripts/smoke-compose-deps.sh   # MySQL + RabbitMQ
./scripts/smoke-localstack.sh     # S3 + SQS via LocalStack
docker compose --profile metrics up -d   # optional Prometheus + Grafana
./scripts/smoke-metrics.sh
docker compose down -v            # teardown
```

`./scripts/localdev.sh start --k8s` uses Spring profiles `local,k8s` (real pipelet Jobs on Rancher). Add `--with-elk` for Elasticsearch/Kibana.

Step-by-step verification (images, Jobs, Petstore): [`docs/LOCALDEV_PIPELINE_GUIDE.md`](docs/LOCALDEV_PIPELINE_GUIDE.md).

### Application API (W0-US02)

Requires Java 21 and Docker (Testcontainers for CI tests). On Rancher Desktop:

```bash
export DOCKER_HOST=unix://$HOME/.rd/docker.sock
./mvnw -pl pipeline-api test
./mvnw -pl pipeline-api spring-boot:run -Dspring-boot.run.profiles=local
curl -s http://localhost:8080/actuator/health
```

Compose MySQL must be up for the `local` profile (`docker compose up -d mysql`). Prefer `./scripts/localdev.sh` to start API + UI together.
