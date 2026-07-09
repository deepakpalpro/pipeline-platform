# pipeline-ui

Vite + React + TypeScript frontend for the Pipeline Platform (Wave 6+).

## Scripts

```bash
npm install
npm run dev                    # needs live API, or:
VITE_ENABLE_MSW=true npm run dev
npm test
npm run build
```

## Layout

```text
src/
  app/        # AppShell, routes, nav items
  contexts/   # AuthContext, TenantContext
  api/        # apiClient, resources, secret helpers
  features/   # connectors, services, placeholders
  mocks/      # MSW handlers (W1-shaped fixtures)
  test/       # setup + renderWithProviders
```

KB: [`docs/delivery/kb/W6-US01-nav-shell.md`](../docs/delivery/kb/W6-US01-nav-shell.md), [`W6-US02-connectors-services-ui.md`](../docs/delivery/kb/W6-US02-connectors-services-ui.md).
