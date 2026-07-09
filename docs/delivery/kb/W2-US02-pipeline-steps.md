# KB: Pipeline steps config API (Wave 2)

| Field | Value |
|-------|--------|
| **Article / Story** | KB-W2-US02 / W2-US02 |
| **Audience** | Platform engineers / tenant admins |
| **Product area** | Pipelines |

## Prerequisites

- W2-US01 pipeline CRUD
- Compose MySQL; Flyway through `V10__pipeline_steps.sql`
- Stub tenancy: `X-Tenant-Id`

## Feature overview

Full **replace** of a pipeline’s step sequence:

| Method | Path | Notes |
|--------|------|-------|
| `PUT` | `/api/v1/pipelines/{id}/steps` | Delete existing steps, insert new set; bumps pipeline `version` |
| `GET` | `/api/v1/pipelines/{id}` | Returns ordered `steps` |

Each step stores: `pipelet_id`, `step_order` (1-based, unique per pipeline), `config`, `connector_ids`, `service_ids`, `input_queue`, `output_queue`, `resource_limits`.

**Empty `steps` array is rejected** (`@NotEmpty`) so a 3-stage fixture can be required later. Queue names may be placeholders until W2-US03 declares RabbitMQ. Pipelet registry FK is deferred — `pipelet_id` is an opaque string.

Isolation: filtered pipeline lookup — cross-tenant PUT → **404**.

## How to verify

```bash
docker compose up -d mysql
./mvnw -pl pipeline-api test -Dtest=PipelineStepsServiceTest,PipelineStepsIT
```

## Manual curl sketch

```bash
curl -s -X PUT "localhost:8080/api/v1/pipelines/$PIPE_ID/steps" \
  -H 'Content-Type: application/json' -H "X-Tenant-Id: $TENANT_ID" \
  -d '{"steps":[{"pipelet_id":"plet-rest-source","step_order":1,"config":{"batch_size":100},"connector_ids":["conn-1"],"service_ids":[],"input_queue":"t.demo.s1.in","output_queue":"t.demo.s1.out"}]}'
```

## Failure modes

| Symptom | Check | Mitigation |
|---------|-------|------------|
| 404 on PUT | Wrong tenant or pipeline id | Use owning tenant’s `X-Tenant-Id` |
| 400 empty steps | `@NotEmpty` on `steps` | Send at least one step |
| 400 duplicate order | Unique `(pipeline_id, step_order)` | Distinct `step_order` values |

## Related

- Developer TDD: [`../tdd/stories/W2-US02-tdd.md`](../tdd/stories/W2-US02-tdd.md)
- Execution plan: [`../waves/WAVE_2.md`](../waves/WAVE_2.md)
- Next: RabbitMQ topology (W2-US03)
