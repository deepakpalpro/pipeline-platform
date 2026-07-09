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
docker compose up -d mysql
```

API: `PUT /api/v1/pipelines/{id}/steps` (full replace). GET pipeline should include ordered `steps`.

---

## 1. RED

| File | Method | Asserts |
|------|--------|---------|
| `PipelineStepsServiceTest` | `replace_ordersSteps` | order 1..n unique |
| `PipelineStepsIT` | `putSteps_thenGetPipeline` | steps in response |

```bash
./mvnw -pl pipeline-api test -Dtest=PipelineStepsServiceTest,PipelineStepsIT
```

**Stop.** Red.

---

## 2. GREEN

1. Flyway `pipeline_steps` (FK to pipelines; unique `(pipeline_id, step_order)`).
2. Replace semantics: delete old steps, insert new (transactional).
3. Validate pipeline belongs to current tenant.

```bash
./mvnw -pl pipeline-api test -Dtest=PipelineStepsServiceTest,PipelineStepsIT
```

### Checklist

- [ ] Cross-tenant PUT → 404
- [ ] Empty steps rejected (prefer `@NotEmpty` for 3-stage fixture later)
- [ ] Increment pipeline `version` on save

---

## 3. REFACTOR

- Sort by `step_order` before insert; reject duplicate orders in service
- Keep request/response JSON snake_case aligned with architecture §3.1
- Leave queue names nullable/placeholder until US03 `QueueNaming` fills them

---

## 4. Manual verify

| # | Action | Expected |
|---|--------|----------|
| 1 | PUT 3 steps on a pipeline | 200; `version` bumped |
| 2 | GET pipeline | `steps` ordered 1..3 |
| 3 | PUT as other tenant | 404 |
| 4 | PUT `"steps":[]` | 400 |

---

## 5. Docs & trackers

- [ ] KB: full-replace semantics + empty rejected
- [ ] Tracker · TEST_MATRIX
- [ ] Mark Done in `WAVE_2.md`

---

## 6. Ship

```text
merge → tag W2-US02 → delete → W2-US03
```

---

## Common pitfalls

| Mistake | Fix |
|---------|-----|
| Partial update API | Architecture is full replace |
| Skipping tenant check on pipeline id | Isolation bug |
| Allowing empty steps | Breaks later 3-stage fixture |
