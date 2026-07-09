# KB: Connectors & Services UI (Wave 6)

| Field | Value |
|-------|--------|
| **Article / Story** | KB-W6-US02 / W6-US02 |
| **Audience** | Frontend engineers / support |
| **Product area** | UI catalogs / connectors / services |

## Prerequisites

- W6-US01 shell (`pipeline-ui`)
- Node 20+ / npm
- Optional: `VITE_ENABLE_MSW=true` for local mock API without backend

## Feature overview

| Surface | Behaviour |
|---------|-----------|
| `/connectors` | Split view: list left, detail/create form right |
| `/services` | Table list + create form; click name for detail |
| MSW | `src/mocks/handlers.ts` mirrors W1 `/api/v1/connectors` and `/api/v1/services` |
| Secrets | GET responses redact keys (`***`); UI displays `••••••` via `displayConfigValue` |

Create payloads:

- Connector: `{ connectorTypeId, name, config }` with Rest fields `baseUrl` / optional `api_key`
- Service: `{ serviceTypeId, vendor, name, tenantConfig }`

All fetches go through `apiFetch` with `X-Tenant-Id` from `TenantContext`.

### Local MSW

```bash
cd pipeline-ui
VITE_ENABLE_MSW=true npm run dev
```

Without the flag, the UI expects a live API (or will fail to load lists).

### Fixtures

| Entity | Id | Notes |
|--------|-----|--------|
| Connector | `conn-1` / Orders API | `api_key` redacted on GET |
| Service | `svc-1` / Primary Auth | `client_secret` redacted; raw value never in DOM |

## Additional config (connectors & services)

Create and edit forms include an **Additional config** key/value editor (same pattern as pipeline step config). Values are stored in free-form JSON:

- Connectors: `config` on create (`POST`) and update (`PUT /api/v1/connectors/{id}`)
- Services: `tenantConfig` on create and update (`PUT /api/v1/services/{id}`)

Secret fields sent as `***` on update are preserved server-side (not overwritten).

## How to verify


```bash
cd pipeline-ui
npm test -- ConnectorForm ServiceForm ConnectorsList ServiceDetail
```

Manual: open Connectors → New → fill type/name/base URL → Create; open Services → click Primary Auth → confirm secret shows as mask only.

## Failure modes

| Symptom | Check | Mitigation |
|---------|-------|------------|
| Empty lists in tests | MSW server in `src/test/setup.ts` | `server.listen` + `resetMockDb` |
| Secret visible in DOM | `ServiceDetail` / `displayConfigValue` | Never render raw GET secret fields |
| 400 on create | Client validation vs MSW | Required: type, name, baseUrl / vendor |

## Related

- Developer TDD: [`../tdd/stories/w6/W6-US02-tdd.md`](../tdd/stories/w6/W6-US02-tdd.md)
- W1 SecretRedactor · Architecture §4.5 / §4.6
- Shell KB: [`W6-US01-nav-shell.md`](W6-US01-nav-shell.md)
