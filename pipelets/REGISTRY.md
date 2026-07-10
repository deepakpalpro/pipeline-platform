# Pipelet runtime registry (local)

Maps catalog pipelet IDs to Docker images that exist in this repo.

| Pipelet ID | Name | Image | Build context |
|------------|------|-------|---------------|
| `plet-s3-source` | S3 Source | `pipeline-platform/plet-s3-source:local` | `docker build -f pipelets/plet-s3-source/Dockerfile -t … pipelets` |
| `plet-csv-to-json` | CSV to JSON | `pipeline-platform/plet-csv-to-json:local` | `docker build -f pipelets/plet-csv-to-json/Dockerfile -t … pipelets` |
| `plet-python-filter` | Python Filter | `pipeline-platform/plet-python-filter:local` | same pattern |
| `plet-field-mapper` | Field Mapper | `pipeline-platform/plet-field-mapper:local` | same pattern |
| `plet-webhook-destination` | Webhook Destination | `pipeline-platform/plet-webhook-destination:local` | same pattern |
| `inventory-batch` | Inventory composite | `pipeline-platform/inventory-pipelet:local` | `pipelets/inventory` (demo only) |

## Data plane (I/O transport)

Pipeline `execution_config.ioMode` controls how stage data moves. The orchestrator injects:

| Env | Purpose |
|-----|---------|
| `IO_MODE` | `stdio` \| `queue` (default **`queue`** when unset) |
| `INPUT_QUEUE` | RabbitMQ stage input queue name |
| `OUTPUT_QUEUE` | Next stage input queue (empty on last stage) |
| `AMQP_URL` | e.g. `amqp://pipeline:pipeline@rabbitmq:5672/` |
| `SOURCE_TRIGGER` | For sources in queue mode: `once` skips waiting for a kickoff message |

- **`stdio`** — read one JSON object from stdin; write one JSON object to stdout (local `docker run \| docker run` chaining).
- **`queue`** — consume from `INPUT_QUEUE`, publish to `OUTPUT_QUEUE` via AMQP (platform / K8s Jobs).

Shared helper: [`_common/io_transport.py`](_common/io_transport.py).

```bash
# Dedicated images (need _common)
for p in plet-s3-source plet-csv-to-json plet-python-filter plet-field-mapper plet-webhook-destination; do
  docker build -f pipelets/$p/Dockerfile -t "pipeline-platform/${p}:local" pipelets
done
```

All five catalog entries are `active: true` with required deployment/execution Keys for pipeline-step configuration.

## Kubernetes Jobs (Fabric8 / Rancher)

With `pipeline.k8s.enabled=true` (profile `local,k8s`), Run creates real Jobs in `tenant-{tenantId}` via Fabric8. See [`docs/delivery/kb/W2-US05-pipelet-job.md`](../docs/delivery/kb/W2-US05-pipelet-job.md).
