# W2-US03 TDD Guide — Inter-stage RabbitMQ topology

| Field | Value |
|-------|--------|
| **Story** | W2-US03 — Tenant-prefixed exchanges/queues; publish/consume |
| **Depends on** | W2-US02 |
| **Branch** | `W2-US03` from `wave-2` |
| **Timebox hint** | 1–1.5 days |
| **You will touch** | RabbitMQ naming builder, topology declarer, IT |
| **Stakeholder TDD** | [`../WAVE_2_TDD.md`](../WAVE_2_TDD.md) |
| **AC source** | [`../../waves/WAVE_2.md`](../../waves/WAVE_2.md) § W2-US03 |
| **Architecture** | §8 messaging |
| **KB (create)** | `docs/delivery/kb/W2-US03-rabbit-topology.md` |

---

## What you are building

Declare **tenant-prefixed** exchanges/queues for pipeline stages and prove publish → consume works against Compose/Testcontainers RabbitMQ.

**Done means:** `RabbitTopologyIT.declareAndPublish` green.

**Out of scope:** Full run orchestrator (US04); webhook queues (W3) — but share naming helpers.

---

## 0. Before you code

```bash
docker compose up -d rabbitmq
# mgmt http://localhost:15672 pipeline/pipeline
```

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `QueueNamingTest` | `includesTenantId` | name contains tenant |
| `RabbitTopologyIT` | `declareAndPublish` | message round-trip |

```bash
./mvnw -pl pipeline-api test -Dtest=QueueNamingTest,RabbitTopologyIT
```

---

## 2. GREEN

1. Spring AMQP dependency if missing.
2. `QueueNaming` / topology service from step `input_queue` / `output_queue` or generated names.
3. Persist resolved queue names onto steps if still placeholders.
4. IT: `assumeTrue` RabbitMQ port 5672 (same pattern as MySQL).

### Checklist

- [ ] Names include `tenant_id`
- [ ] Idempotent declare
- [ ] Shared builder documented for W3

---

## 6. Ship

```text
merge → tag W2-US03 → W2-US04 (and/or US06 in parallel)
```

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Global queue names | Always tenant-prefix |
| Using LocalStack SQS | Wrong broker — RabbitMQ for platform stages |
