# Wave 2 TDD — Pipelines & Ephemeral Execution

| Field | Value |
|-------|--------|
| **Wave** | W2 — Pipelines & Ephemeral Execution |
| **Audience** | Technical stakeholders |
| **Status** | In Progress (W2-US01–US06 Done) |
| **Architecture refs** | §1.4, §2 pipeline tables, §3.1–3.2, §8, §10.3 |
| **Branch / tags** | `wave-2` · `W2-US##` |
| **Last updated** | 2026-07-09 |
| **Template** | [`../TDD_WAVE_TEMPLATE.md`](../TDD_WAVE_TEMPLATE.md) |
| **Catalog** | [`../../DELIVERY_PLAN.md`](../../DELIVERY_PLAN.md) § Wave 2 |
| **Execution plan** | [`../waves/WAVE_2.md`](../waves/WAVE_2.md) |
| **Developer story TDD** | [`stories/README.md`](stories/README.md) § Wave 2 |
| **Coverage** | [`../TEST_MATRIX.md`](../TEST_MATRIX.md) § Wave 2 |

---

## 1. Stakeholder summary

Wave 2 proves a configurable Source → Processor → Destination pipeline can run asynchronously: RabbitMQ topology hands off between stages, execution status is persisted, poison messages land on stage DLQ, and a pipelet Job can be spawned (Kind or stub).

| Quality goal | How we prove it |
|--------------|-----------------|
| Pipeline CRUD + steps | Unit + MySQL IT |
| Stage messaging | RabbitMQ Testcontainers IT |
| Async run | Orchestration IT + status API |
| Resilience | Forced failure → DLQ assert |
| Ephemeral Job | Kind/stub spawn smoke |

**Out of scope:** Webhook ingress accept path (W3), full Grafana, billing enforcement, UI builder.

---

## 2. Test strategy

```mermaid
flowchart TB
  Unit[Unit_orchestrator_routing] --> IT_DB[IT_MySQL_pipeline_CRUD]
  IT_DB --> IT_RMQ[IT_RabbitMQ_topology]
  IT_RMQ --> Run[Async_run_fixture]
  Run --> DLQ[DLQ_failure_path]
  Run --> Job[Kind_or_stub_Job]
```

| Layer | Tools | Cadence | Notes |
|-------|-------|---------|-------|
| Unit | JUnit, Mockito | Every PR | Routing keys, state machine, retry policy |
| Integration | MySQL + RabbitMQ containers | Every PR / nightly | Prefer Testcontainers |
| Manual / Kind | Compose + Kind | Story/wave exit | Job spawn if Kind available |

**CI gates (target)**

1. Pipeline CRUD + steps IT
2. Topology publish/consume IT
3. Fixture 3-stage run → `completed`
4. One DLQ path IT green

---

## 3. Environments & fixtures

| Fixture | Entity | Path (planned) |
|---------|--------|----------------|
| `PipelineFixtures.threeStage` | pipeline + steps | `fixtures/pipelines/` |
| `TenantFixtures.T001` | tenant | reuse W0/W1 |
| `ExecutionFixtures.execHappy` | execution | `fixtures/executions/` |

**Real vs mocked**

| Dependency | Unit | IT | Manual |
|------------|------|----|--------|
| MySQL | mock | Testcontainers/Compose | Compose |
| RabbitMQ | mock publisher | Testcontainers/Compose | Compose |
| K8s Jobs | mock client | stub or Kind | Kind preferred |

---

## 4. Story TDD backlog

Junior step-by-step guides: [`stories/README.md`](stories/README.md) § Wave 2.

### W2-US01 — Pipeline CRUD (+ visibility/mode)

**Developer guide:** [`stories/W2-US01-tdd.md`](stories/W2-US01-tdd.md)

| Step | Evidence |
|------|----------|
| **Red** | `PipelineServiceTest`, `PipelineControllerIT` fail |
| **Green** | CRUD + tenant scoping |
| **Refactor** | Status enum validation |

### W2-US02 — Pipeline steps config API

**Developer guide:** [`stories/W2-US02-tdd.md`](stories/W2-US02-tdd.md)

| Step | Evidence |
|------|----------|
| **Red** | `PipelineStepsServiceTest` / `PipelineStepsIT` |
| **Green** | `PUT .../steps` full replace; GET returns ordered steps; version bump; empty rejected |
| **Refactor** | Duplicate `step_order` validation; sorted insert |

| Status | Done |

### W2-US03 — Inter-stage RabbitMQ topology

**Developer guide:** [`stories/W2-US03-tdd.md`](stories/W2-US03-tdd.md)

| Step | Evidence |
|------|----------|
| **Red** | `QueueNamingTest` / `RabbitTopologyIT` |
| **Green** | Tenant-prefixed exchange/queues; idempotent declare; publish→consume |
| **Refactor** | Shared `QueueNaming` (webhook helpers for W3) |

| Status | Done |

### W2-US04 — Async run orchestration

**Developer guide:** [`stories/W2-US04-tdd.md`](stories/W2-US04-tdd.md)

| Step | Evidence |
|------|----------|
| **Red** | `PipelineRunOrchestratorTest` / `PipelineRunIT` |
| **Green** | `POST .../run` → 202 + execution id; stub worker → `completed` |
| **Refactor** | Orchestrator vs stub worker separation |

| Status | Done |

### W2-US05 — Pipelet Job spawn (Kind/stub)

**Developer guide:** [`stories/W2-US05-tdd.md`](stories/W2-US05-tdd.md)

| Step | Evidence |
|------|----------|
| **Red** | `PipeletJobClientTest` / extended `PipelineRunIT` |
| **Green** | Stub records creates with tenant/pipeline/execution; run path spawns per stage |
| **Refactor** | Interface ready for Kind/Fabric8 swap |

| Status | Done |

### W2-US06 — Retries + per-stage DLQ

**Developer guide:** [`stories/W2-US06-tdd.md`](stories/W2-US06-tdd.md)

| Step | Evidence |
|------|----------|
| **Red** | `RetryPolicyTest` / `StageDlqIT.poison_landsOnDlq` |
| **Green** | DLX on stage queues; retry then DLQ; error headers |
| **Refactor** | `StageDeadLetterService` + `RetryPolicy` |

| Status | Done |

### W2-US07 — Execution status query API

**Developer guide:** [`stories/W2-US07-tdd.md`](stories/W2-US07-tdd.md)

| Step | Evidence |
|------|----------|
| **Red** | `ExecutionStatusIT` fail |
| **Green** | Status/detail endpoints for fixture run |
| **Refactor** | Read models only |

---

## 5. Cross-cutting test themes

| Theme | Wave-specific rule | Owning stories |
|-------|--------------------|----------------|
| Tenant-prefixed queues | Assert naming contains tenant id | US03–US06 |
| Deterministic fixture run | Same `threeStage` pipeline every exit demo | US04, US07 |
| Isolation | Pipeline rows filtered by tenant | US01–US02, US07 |
| No hang forever | Timeouts on async IT awaits | US04 |

---

## 6. Wave exit criteria ↔ tests

| Exit criterion | Verification |
|----------------|--------------|
| 3-stage fixture → `completed` | Run IT + status API |
| Forced failure → DLQ | `StageDlqIT` |
| KB “pipeline run failed” + dataflow | `docs/delivery/kb/W2-*-run-failed.md` |

---

## 7. Risks & deferrals

| Risk / deferral | Impact | Mitigation |
|-----------------|--------|------------|
| Kind unavailable | US05 blocked | Accept stub Job client with contract IT |
| Flaky async waits | CI noise | Awaitility + bounded timeout |
| Topology drift vs W3 | Ingress mismatch | Shared routing-key builder early |

---

## 8. Change log

| Date | Change |
|------|--------|
| 2026-07-08 | Initial Draft for technical stakeholders |
| 2026-07-09 | Linked execution plan + junior story TDD guides; wave-2 started |
| 2026-07-09 | W2-US01 implemented: pipeline CRUD + tenant isolation |
