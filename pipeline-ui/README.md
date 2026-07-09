# pipeline-ui

Vite + React + TypeScript frontend for the Pipeline Platform (Wave 6+).

## Scripts

```bash
npm install
npm run dev      # local shell
npm test         # Vitest (jsdom)
npm run build    # production bundle
```

## Layout

```text
src/
  app/        # AppShell, routes, nav items
  contexts/   # AuthContext, TenantContext
  api/        # stub apiClient (X-Tenant-Id)
  features/   # placeholder pages (later stories)
  test/       # setup + renderWithProviders
```

See [`docs/delivery/kb/W6-US01-nav-shell.md`](../docs/delivery/kb/W6-US01-nav-shell.md).
