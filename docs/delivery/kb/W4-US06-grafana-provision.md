# KB: Grafana provision (Wave 4)

| Field | Value |
|-------|--------|
| **Article / Story** | KB-W4-US06 / W4-US06 |
| **Audience** | Platform engineers / SRE |
| **Product area** | Observability / Grafana |

## Prerequisites

- W4-US02 completeness metrics (dashboard panels reference them)
- Architecture §7.2 (Grafana org per tenant)

## Feature overview

Wave 4 ships a **stub** provision path (no live Grafana required in CI):

| Component | Role |
|-----------|------|
| `GrafanaClient` | Interface (`createOrg`, `upsertDashboard`) |
| `StubGrafanaClient` | In-memory recording client |
| `GrafanaProvisioner` | Maps tenant → org + template dashboard |
| Template | `classpath:grafana/tenant-pipeline-overview.json` |
| Optional API | `POST /api/v1/tenants/{id}/grafana` → `201` |

**Stub vs real:** Replace `StubGrafanaClient` with an HTTP client against Grafana Admin API when ops Grafana is available. Tokens stay in env/config — never commit secrets.

## How to verify

```bash
./mvnw -pl pipeline-api test -Dtest=GrafanaProvisionerTest
```

Manual (with API running):

```bash
curl -s -X POST "http://localhost:8080/api/v1/tenants/<tenant-id>/grafana"
```

## Failure modes

| Symptom | Check | Mitigation |
|---------|-------|------------|
| 404 on provision | Unknown tenant id | Create tenant first |
| Missing template | Classpath resource | Confirm `grafana/tenant-pipeline-overview.json` |
| Expecting live Grafana | Stub only in Wave 4 | Wire real client later |

## Related

- Developer TDD: [`../tdd/stories/w4/W4-US06-tdd.md`](../tdd/stories/w4/W4-US06-tdd.md)
- Completeness: [`W4-US02-completeness.md`](W4-US02-completeness.md)
- Architecture §7.2
