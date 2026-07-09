import { Navigate, Route, Routes } from 'react-router-dom'
import { ConnectorsPage } from '../features/connectors/ConnectorsPage'
import { ServicesPage } from '../features/services/ServicesPage'
import { PipeletsCatalogPage } from '../features/pipelets/PipeletsCatalogPage'
import { PipelineBuilderPage } from '../features/pipelines/builder/PipelineBuilderPage'
import { ObservabilityPage } from '../features/observability/ObservabilityPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pipelets" replace />} />
      <Route path="/pipelets" element={<PipeletsCatalogPage />} />
      <Route path="/pipelines" element={<PipelineBuilderPage />} />
      <Route path="/connectors" element={<ConnectorsPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/observability" element={<ObservabilityPage />} />
      <Route path="*" element={<Navigate to="/pipelets" replace />} />
    </Routes>
  )
}
