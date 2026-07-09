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
| `StepPropertiesPanel` | Bind connector/service ids; edit step `config` key/values; remove step |
| Save | `POST /api/v1/pipelines` then `PUT /api/v1/pipelines/{id}/steps` (re-save updates steps only) |

### Step config (key/value)

1. Select a step on the canvas.
2. Under **Config**, enter a key + value and click **Add**.
3. Edit values inline; remove a key with **×**.
4. Values are stored on `node.data.config` and included in the save payload `steps[].config`.

### Local save without backend

`npm run dev` enables MSW by default in development. Use `npm run dev:api` (or `VITE_ENABLE_MSW=false`) to call a live API.

If Save fails with a network/404 error, you are likely running without MSW and without `pipeline-api` on the same origin.

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
| Save 404 / failed | MSW off + no API | `npm run dev` (MSW default); or run `pipeline-api` with `npm run dev:api` |
| React Flow blank in jsdom | ResizeObserver | Polyfill in `test/setup.ts`; mock canvas in save test |

## Related

- Developer TDD: [`../tdd/stories/w6/W6-US04-tdd.md`](../tdd/stories/w6/W6-US04-tdd.md)
- Architecture §4.3–§4.4 · W2 steps API
