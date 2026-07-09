# W2-US02 TDD Guide — Pipeline steps config API

| Field | Value |
|-------|--------|
| **Story** | W2-US02 — Put steps / connector_ids / queues metadata |
| **Depends on** | W2-US01 |
| **Branch** | `W2-US02` from `wave-2` |
| **Timebox hint** | 1 day |
| **You will touch** | `pipeline_steps`, `PUT /pipelines/{id}/steps` |
| **Stakeholder TDD** | [`../WAVE_2_TDD.md`](../WAVE_2_TDD.md) |
| **AC source** | [`../../waves/WAVE_2.md`](../../waves/WAVE_2.md) § W2-US02 |
| **Architecture** | §2 `pipeline_steps`, §3.1 |
| **KB (create)** | `docs/delivery/kb/W2-US02-pipeline-steps.md` |

---

## What you are building

Replace the full step sequence for a pipeline (Source → Processor → Destination). Store `step_order`, connector/service id arrays, and queue name fields (may be placeholders until US03 declares RabbitMQ).

**Done means:** `PipelineStepsServiceTest` + IT replace steps and GET pipeline returns them.

**Out of scope:** Declaring Rabbit topology; running the pipeline.

---

## 0. Before you code

```bash
git checkout wave-2 && git pull
git checkout -b W2-US02
```

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `PipelineStepsServiceTest` | `replace_ordersSteps` | order 1..n unique |
| `PipelineStepsIT` | `putSteps_thenGetPipeline` | steps in response |

```bash
./mvnw -pl pipeline-api test -Dtest=PipelineStepsServiceTest,PipelineStepsIT
```

---

## 2. GREEN

1. Flyway `pipeline_steps` (FK to pipelines; unique `(pipeline_id, step_order)`).
2. Replace semantics: delete old steps, insert new (transactional).
3. Validate pipeline belongs to current tenant.

### Checklist

- [ ] Cross-tenant PUT → 404
- [ ] Empty steps rejected or allowed? Document choice (prefer reject empty for 3-stage fixture later)
- [ ] Increment pipeline `version` on save if architecture requires

---

## 3–6. Refactor / manual / docs / ship

```text
merge → tag W2-US02 → W2-US03
```

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Partial update API | Architecture is full replace |
| Skipping tenant check on pipeline id | Isolation bug |
