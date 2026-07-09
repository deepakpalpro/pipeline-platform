import { Navigate, Route, Routes } from 'react-router-dom'
import { PlaceholderPage } from '../features/PlaceholderPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pipelets" replace />} />
      <Route path="/pipelets" element={<PlaceholderPage title="Pipelets" />} />
      <Route path="/pipelines" element={<PlaceholderPage title="Pipelines" />} />
      <Route
        path="/connectors"
        element={<PlaceholderPage title="Connectors" />}
      />
      <Route path="/services" element={<PlaceholderPage title="Services" />} />
      <Route
        path="/observability"
        element={<PlaceholderPage title="Observability" />}
      />
      <Route path="*" element={<Navigate to="/pipelets" replace />} />
    </Routes>
  )
}
