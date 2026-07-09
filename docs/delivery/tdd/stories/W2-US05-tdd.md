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

An interface the orchestrator calls to **spawn ephemeral work**. Default: in-process stub that records create requests. Optional: Kind Job if available.

**Done means:** `PipeletJobClientTest` proves create is invoked with tenant/pipeline/execution ids.

**Out of scope:** Production cluster RBAC; full container images.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `PipeletJobClientTest` | `stub_recordsCreate` | request captured |
| `PipelineRunIT` (extend) | run path calls client | verify mock/stub |

---

## 2. GREEN

1. `PipeletJobClient` + `StubPipeletJobClient` `@Profile` or `@Primary` for local.
2. Wire into orchestrator stage start.
3. Document Kind path as optional manual.

---

## 6. Ship

```text
merge → tag W2-US05 → continue US06/US07
```

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Blocking wave on Kind | Stub is acceptable for Wave 2 |
| No interface | Hard to swap later |
