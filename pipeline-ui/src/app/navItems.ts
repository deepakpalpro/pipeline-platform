export const NAV_ITEMS = [
  { label: 'Pipelets', path: '/pipelets' },
  { label: 'Pipelines', path: '/pipelines' },
  { label: 'Connectors', path: '/connectors' },
  { label: 'Services', path: '/services' },
  { label: 'Observability', path: '/observability' },
] as const

export type NavPath = (typeof NAV_ITEMS)[number]['path']
