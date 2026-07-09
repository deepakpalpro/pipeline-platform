# KB: Pipeline builder save (Wave 6)

| Field | Value |
|-------|--------|
| **Article / Story** | KB-W6-US04 / W6-US04 |
| **Audience** | Frontend engineers / support |
| **Product area** | UI pipeline builder |

## Prerequisites

- W6-US01–US03 (`pipeline-ui`)
- Optional: `VITE_ENABLE_MSW=true` for local save without backend

## Feature overview

`/pipelines` is a three-panel builder (palette | React Flow canvas | properties):

| Piece | Role |
|-------|------|
| `pipelineGraphReducer` | Pure ADD_NODE / CONNECT / UPDATE_STEP / REMOVE |
| `graphToStepsPayload` | Topological order → W2 `PUT .../steps` body |
| `PipeletPalette` | Click-to-add from US03 catalog (auto-connects to previous) |
| `StepPropertiesPanel` | Bind connector/service ids from US02 lists |
| Save | `POST /api/v1/pipelines` then `PUT /api/v1/pipelines/{id}/steps` |

### `threeStage` fixture shape

Save payload steps (ordered):

1. `plet-rest-source`
2. `plet-json-transform`
3. `plet-s3-destination`

Each step includes `pipelet_id`, `step_order`, `config`, `connector_ids`, `service_ids`, `input_queue`, `output_queue`.

### Remove a step

1. Click the step on the canvas (or it is already selected after add).
2. In **Properties**, click **Remove step** — or focus the canvas and press **Delete** / **Backspace**.
3. Connected edges for that node are removed with it.

### Manual smoke

1. Open Pipelines; name `threeStage`.
2. Add REST Source → JSON Transform → S3 Destination from palette.
3. Select source; pick connector. Select destination; pick service.
4. Optionally remove/re-add a middle step via **Remove step**.
5. Save → status shows pipeline id/version.
6. With MSW, inspect `mockDb.lastStepsPut` in tests; with live API, `GET` pipeline steps.

## How to verify

```bash
cd pipeline-ui
npm test -- pipelineGraphReducer PipelineBuilder.save
```

## Failure modes

| Symptom | Check | Mitigation |
|---------|-------|------------|
| Save 404 on steps | Pipeline create failed | Ensure `X-Tenant-Id`; MSW pipeline handlers present |
| Wrong step order | Edges missing | Palette auto-connect; or connect on canvas |
| React Flow blank in jsdom | ResizeObserver | Polyfill in `test/setup.ts`; mock canvas in save test |

## Related

- Developer TDD: [`../tdd/stories/w6/W6-US04-tdd.md`](../tdd/stories/w6/W6-US04-tdd.md)
- Architecture §4.3–§4.4 · W2 steps API
