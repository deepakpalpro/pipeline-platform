import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export const TENANT_STORAGE_KEY = 'pipeline.tenantId'
export const DEFAULT_TENANT_ID = 'T001'

export type StubTenant = {
  id: string
  name: string
}

/** Local stub tenants until IdP / tenant list API is wired. */
export const STUB_TENANTS: StubTenant[] = [
  { id: 'T001', name: 'Acme Analytics' },
  { id: 'T002', name: 'Beta Logistics' },
]

type TenantContextValue = {
  tenantId: string
  tenantName: string
  setTenantId: (id: string) => void
  tenants: StubTenant[]
}

const TenantContext = createContext<TenantContextValue | null>(null)

function readStoredTenantId(): string {
  try {
    const stored = sessionStorage.getItem(TENANT_STORAGE_KEY)
    if (stored && STUB_TENANTS.some((t) => t.id === stored)) {
      return stored
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_TENANT_ID
}

export function TenantProvider({
  children,
  initialTenantId,
}: {
  children: ReactNode
  initialTenantId?: string
}) {
  const [tenantId, setTenantIdState] = useState(
    () => initialTenantId ?? readStoredTenantId(),
  )

  const setTenantId = useCallback((id: string) => {
    setTenantIdState(id)
    try {
      sessionStorage.setItem(TENANT_STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const tenantName =
    STUB_TENANTS.find((t) => t.id === tenantId)?.name ?? tenantId

  const value = useMemo(
    () => ({
      tenantId,
      tenantName,
      setTenantId,
      tenants: STUB_TENANTS,
    }),
    [tenantId, tenantName, setTenantId],
  )

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  )
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return ctx
}
