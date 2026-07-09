import { Navigate, Route, Routes } from 'react-router-dom'
import { PlaceholderPage } from '../features/PlaceholderPage'
import { ConnectorsPage } from '../features/connectors/ConnectorsPage'
import { ServicesPage } from '../features/services/ServicesPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pipelets" replace />} />
      <Route path="/pipelets" element={<PlaceholderPage title="Pipelets" />} />
      <Route path="/pipelines" element={<PlaceholderPage title="Pipelines" />} />
      <Route path="/connectors" element={<ConnectorsPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route
        path="/observability"
        element={<PlaceholderPage title="Observability" />}
      />
      <Route path="*" element={<Navigate to="/pipelets" replace />} />
    </Routes>
  )
}
