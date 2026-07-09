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
| **Architecture** | §8 messaging; appendix topology |
| **KB (create)** | `docs/delivery/kb/W2-US03-rabbit-topology.md` |

---

## What you are building

Declare **tenant-prefixed** stage destinations on the **platform message broker** and prove publish → consume works. Wave 2’s default broker is **RabbitMQ** (Compose/Testcontainers); architecture §5.1 makes the broker pluggable (Kafka, SQS, Event Hubs, ActiveMQ, …) via a future SPI — do not hard-wire product assumptions into pipeline/step APIs.

**Done means:** `RabbitTopologyIT.declareAndPublish` green (RabbitMQ adapter).

**Out of scope:** Full run orchestrator (US04); webhook queues (W3) — but share naming helpers; non-RabbitMQ adapters.

---

## 0. Before you code

```bash
git checkout wave-2 && git pull
git checkout -b W2-US03
docker compose up -d mysql rabbitmq
# mgmt http://localhost:15672 pipeline/pipeline
```

Target names (architecture appendix):

```text
Exchange: tenant.{tenantId}.pipeline.{pipelineId}
Queue:    ...stage.{n}.in
DLQ:      ...stage.{n}.dlq   (declare now; DLX wiring in US06)
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

**Stop.** Red.

---

## 2. GREEN

1. Spring AMQP dependency if missing (`spring-boot-starter-amqp`).
2. `QueueNaming` / `PipelineTopologyService` from step queues or generated names.
3. Persist resolved queue names onto steps if still placeholders.
4. IT: `assumeTrue` RabbitMQ port 5672 (same pattern as MySQL).

```bash
./mvnw -pl pipeline-api test -Dtest=QueueNamingTest,PipelineTopologyServiceTest,RabbitTopologyIT
```

### Checklist

- [ ] Names include `tenant_id`
- [ ] Idempotent declare
- [ ] Shared builder documented for W3 (webhook helpers OK)

---

## 3. REFACTOR

- Keep `QueueNaming` free of Spring (unit-testable)
- Inject `AmqpAdmin` (Boot auto-config), not a custom `RabbitAdmin` bean unless needed
- Disable rabbit health indicator if non-messaging ITs fail when broker is down

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | `docker compose up -d rabbitmq` | healthy on 5672 / 15672 |
| 2 | Run `RabbitTopologyIT` | green |
| 3 | Mgmt UI → Exchanges | `tenant.*.pipeline.*` present after IT |

---

## 5. Docs & trackers

- [ ] KB: naming table + Compose ports
- [ ] Tracker · TEST_MATRIX
- [ ] Note W3 reuses `QueueNaming.webhook*`

---

## 6. Ship

```text
merge → tag W2-US03 → W2-US04 (and/or US06 in parallel)
```

---

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Global queue names | Always tenant-prefix |
| Using LocalStack SQS | Wrong broker — RabbitMQ for platform stages |
| Binding stub worker to every stage exchange | Breaks topology IT receive asserts |
