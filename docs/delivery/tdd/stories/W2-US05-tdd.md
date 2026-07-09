# W2-US05 TDD Guide — Pipelet Job spawn (Kind/stub)

| Field | Value |
|-------|--------|
| **Story** | W2-US05 — Create pipelet Job/Pod (Kind or stub) |
| **Depends on** | W2-US04 |
| **Branch** | `W2-US05` from `wave-2` |
| **Timebox hint** | 1 day |
| **You will touch** | `PipeletJobClient` interface + stub/Kind impl |
| **Stakeholder TDD** | [`../WAVE_2_TDD.md`](../WAVE_2_TDD.md) |
| **AC source** | [`../../waves/WAVE_2.md`](../../waves/WAVE_2.md) § W2-US05 |
| **Architecture** | §10.3 |
| **KB (create)** | `docs/delivery/kb/W2-US05-pipelet-job.md` |

---

## What you are building

An interface the orchestrator calls to **spawn ephemeral work** for each **pipeline step** (the step’s pipelet config → one Job/Pod). Default: in-process stub that records create requests. Optional: Kind Job if available.

**Done means:** `PipeletJobClientTest` proves create is invoked with tenant/pipeline/execution/pipelet ids from the step.

**Out of scope:** Production cluster RBAC; full container images.

---

## 0. Before you code

```bash
git checkout wave-2 && git pull
git checkout -b W2-US05
```

Architecture §10.3 naming:

```text
Job name:  exec-{execution_id}-stage-{step_order}
Namespace: tenant-{tenant_id}
```

Kind is **optional** — stub is enough to close the story.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `PipeletJobClientTest` | `stub_recordsCreate` | request captured |
| `PipelineRunIT` (extend) | run path calls client | N creates for N stages |

```bash
./mvnw -pl pipeline-api test -Dtest=PipeletJobClientTest,PipelineRunOrchestratorTest,PipelineRunIT
```

**Stop.** Red.

---

## 2. GREEN

1. `PipeletJobClient` + `StubPipeletJobClient` (default `@Component`).
2. Wire into orchestrator stage-1 start and stub worker for stages 2..N.
3. Document Kind path as optional manual in KB.

```bash
./mvnw -pl pipeline-api test -Dtest=PipeletJobClientTest,PipelineRunIT
```

### Checklist

- [ ] Request includes tenant / pipeline / execution / pipelet ids
- [ ] Job name + namespace match §10.3
- [ ] Run IT asserts create count == stage count

---

## 3. REFACTOR

- Keep SPI free of Fabric8 types so stub stays lightweight
- Prefer `@ConditionalOnMissingBean` later when adding Kind client
- Do not block wave exit on Kind availability

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | Run 3-stage `PipelineRunIT` | stub records 3 creates |
| 2 | (Optional) Kind cluster + real client | `kubectl get jobs -n tenant-<id>` |

---

## 5. Docs & trackers

- [ ] KB: stub vs Kind swap checklist
- [ ] Tracker · TEST_MATRIX
- [ ] Mark Done in `WAVE_2.md`

---

## 6. Ship

```text
merge → tag W2-US05 → continue US06/US07
```

---

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Blocking wave on Kind | Stub is acceptable for Wave 2 |
| No interface | Hard to swap later |
| Creating Job only for stage 1 | Worker must spawn subsequent stages |
