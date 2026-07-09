# W2-US04 TDD Guide — Async run orchestration

| Field | Value |
|-------|--------|
| **Story** | W2-US04 — Async `POST .../run` orchestration across stages |
| **Depends on** | W2-US03 |
| **Branch** | `W2-US04` from `wave-2` |
| **Timebox hint** | 1.5–2 days |
| **You will touch** | `pipeline_executions`, run endpoint, orchestrator |
| **Stakeholder TDD** | [`../WAVE_2_TDD.md`](../WAVE_2_TDD.md) |
| **AC source** | [`../../waves/WAVE_2.md`](../../waves/WAVE_2.md) § W2-US04 |
| **Architecture** | §3.1 run, §8 async |
| **KB (create)** | `docs/delivery/kb/W2-US04-async-run.md` |

---

## What you are building

`POST /api/v1/pipelines/{id}/run` creates an execution and drives stages asynchronously via RabbitMQ. HTTP returns quickly with an execution id; fixture 3-stage pipeline eventually reaches a terminal state (full `completed` may need US05 stub).

**Done means:** Run IT starts execution; status progresses (or completes with stub workers).

**Out of scope:** Real K8s Jobs (US05); status query polish (US07 can deepen).

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `PipelineRunOrchestratorTest` | `start_createsExecution` | status `running`/`queued` |
| `PipelineRunIT` | `run_returnsExecutionId` | 202/200 + id |

---

## 2. GREEN

1. Flyway `pipeline_executions` if not already added.
2. Orchestrator publishes to first stage; consumers advance (stub OK).
3. Bound timeouts (Awaitility).

### Checklist

- [ ] Tenant isolation on run
- [ ] Inactive/archived pipeline rejected
- [ ] No infinite wait in IT

---

## 6. Ship

```text
merge → tag W2-US04 → W2-US05 / W2-US07
```
