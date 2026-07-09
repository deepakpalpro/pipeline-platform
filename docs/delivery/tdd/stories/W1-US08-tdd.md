# W1-US08 TDD Guide — MessageBus connector vs LocalStack SQS (Should)

| Field | Value |
|-------|--------|
| **Story** | W1-US08 — MessageBus connector publish against LocalStack SQS |
| **Priority** | **Should** (can defer with tracker note if needed) |
| **Depends on** | W1-US05; W0-US01 LocalStack |
| **Branch** | `W1-US08` from `wave-1` |
| **Timebox hint** | 0.5–1 day |
| **You will touch** | `MessageBusConnector`, SQS client, IT publish+receive |
| **Stakeholder TDD** | [`../WAVE_1_TDD.md`](../WAVE_1_TDD.md) |
| **AC source** | [`../../waves/WAVE_1.md`](../../waves/WAVE_1.md) § W1-US08 |
| **Architecture** | §9.5 `message_bus`; LocalStack SQS |
| **KB (create)** | `docs/delivery/kb/W1-US08-messagebus-sqs.md` |

---

## What you are building (plain English)

A **MessageBus** connector that **publishes** a message to a LocalStack SQS queue (and ideally receives/verifies it in the IT).

**Done means:** `MessageBusConnectorIT.publish_succeeds` green.

**Note:** RabbitMQ is the platform’s internal bus (Wave 2). This story is the **external** SQS-style connector via LocalStack.

---

## 0. Before you code

```bash
git checkout wave-1 && git pull
git checkout -b W1-US08
docker compose up -d localstack
./scripts/smoke-localstack.sh
```

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `MessageBusConnectorIT` | `publish_succeeds` | publish OK; receive same body (or `testConnection` + publish) |
| `MessageBusConnectorTest` | `getType_isMessageBus` | `"message_bus"` (or architecture name) |

```bash
./mvnw -pl pipeline-api test -Dtest=MessageBusConnectorIT,MessageBusConnectorTest
```

**Stop.** Red.

---

## 2. GREEN

1. Implement `MessageBusConnector` with SQS client → LocalStack endpoint.
2. Config: `queueUrl` or `queueName`, endpoint, region.
3. `write` / publish API on SPI; `testConnection` can get queue attributes.
4. Register plugin + seed type.

```bash
./mvnw -pl pipeline-api test -Dtest=MessageBusConnectorIT
```

### Checklist

- [ ] Naming aligned with architecture (`message_bus`)
- [ ] LocalStack only
- [ ] Tracker notes if deferred

---

## 3. REFACTOR

- Share LocalStack client config with Storage connector factory
- Clear distinction in KB: SQS connector ≠ RabbitMQ topology

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Smoke script | SQS queue ops OK |
| 2 | IT | Green |

---

## 5. Docs & trackers

- [ ] KB short note
- [ ] If deferred: WAVE_TRACKER Blockers = “Should deferred” + reason
- [ ] TEST_MATRIX when Done

---

## 6. Ship

```text
merge → tag W1-US08 → prepare wave-1 exit / PR
```

Wave 1 exit still requires: isolation, Rest WireMock test, S3 round-trip, connector KB. US08 is Should.

---

## Common pitfalls (junior)

| Mistake | Fix |
|---------|-----|
| Publishing to RabbitMQ for this story | Wrong broker — use SQS/LocalStack |
| Confusing platform queues with connector | Document in KB |
| Skipping because “Should” without tracker note | Always record deferral |

---

## Help / escalate

- Confirm queue naming with architecture before inventing patterns
- Reuse US07 LocalStack client lessons
