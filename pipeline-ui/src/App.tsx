import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'
import { AppShell } from './app/AppShell'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <AppShell />
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
