# KB: Pipelet Job client (Wave 2)

| Field | Value |
|-------|--------|
| **Article / Story** | KB-W2-US05 / W2-US05 |
| **Audience** | Platform engineers |
| **Product area** | Orchestration / Kubernetes |

## Prerequisites

- W2-US04 async run
- Architecture §10.3 Job shape

## Feature overview

Each **pipeline step** is the config for one pipelet; at run time the orchestrator asks `PipeletJobClient` to spawn that step as a Job/Pod (architecture §10.3). The stub records the create request; a Kind/cluster client would create the real Job from the same request (pipelet id, queues, limits from the step).

| Type | Class | Role |
|------|-------|------|
| Interface | `PipeletJobClient` | `create(PipeletJobRequest)` |
| Default | `StubPipeletJobClient` | Records creates in-memory; no cluster |
| Request | `PipeletJobRequest` | Built from the **step** + execution: tenant/pipeline/execution/pipelet + queues + Job name/ns |

Naming (architecture §10.3):

- Job name: `exec-{executionId}-stage-{n}` (one Job per step order)
- Namespace: `tenant-{tenantId}`

**Wiring:** orchestrator creates stage-1 Job from step 1; `StubStageWorker` creates Jobs for steps 2..N while advancing RabbitMQ messages.

## Kind / cluster (optional)

Wave 2 does **not** require Kind. To add a real client later:

1. Implement `PipeletJobClient` with Fabric8/official client.
2. Mark stub `@ConditionalOnMissingBean` or profile `local` vs `k8s`.
3. Manual smoke: Kind cluster + `kubectl get jobs -n tenant-<id>`.

## How to verify

```bash
docker compose up -d mysql rabbitmq
./mvnw -pl pipeline-api test -Dtest=PipeletJobClientTest,PipelineRunOrchestratorTest,PipelineRunIT
```

## Failure modes

| Symptom | Check | Mitigation |
|---------|-------|------------|
| Zero Job creates after run | Client not wired | Inject `PipeletJobClient` into orchestrator/worker |
| Wrong namespace | Tenant id missing | Always pass tenant from execution |

## Related

- Developer TDD: [`../tdd/stories/W2-US05-tdd.md`](../tdd/stories/W2-US05-tdd.md)
- Next: DLQ (W2-US06) or execution status API (W2-US07)
