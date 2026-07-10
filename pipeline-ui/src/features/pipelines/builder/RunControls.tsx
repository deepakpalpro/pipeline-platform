type Props = {
  canRun: boolean
  saving?: boolean
  deploying?: boolean
  running?: boolean
  status?: string | null
  onDryRun: () => void
  onSave: () => void
  onDeploy: () => void
  onRun: () => void
}

function normalizeStatus(status?: string | null): string {
  return (status ?? 'DRAFT').toUpperCase()
}

export function RunControls({
  canRun,
  saving,
  deploying,
  running,
  status,
  onDryRun,
  onSave,
  onDeploy,
  onRun,
}: Props) {
  const normalized = normalizeStatus(status)
  const isActive = normalized === 'ACTIVE'
  const busy = Boolean(saving || deploying || running)

  return (
    <div className="run-controls" aria-label="Run controls">
      <span
        className={
          isActive ? 'pipeline-status-badge active' : 'pipeline-status-badge'
        }
        data-testid="pipeline-status"
      >
        {normalized}
      </span>
      <button
        type="button"
        className="secondary"
        onClick={onDryRun}
        disabled={!canRun || busy}
      >
        Dry Run
      </button>
      <button
        type="button"
        className="secondary"
        onClick={onSave}
        disabled={busy || !canRun}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={onDeploy}
        disabled={!canRun || busy || isActive}
        title={
          isActive
            ? 'Pipeline is already active'
            : 'Save and activate so the pipeline can run'
        }
      >
        {deploying ? 'Deploying…' : isActive ? 'Deployed' : 'Deploy'}
      </button>
      <button type="button" onClick={onRun} disabled={!canRun || busy}>
        {running ? 'Running…' : 'Run'}
      </button>
    </div>
  )
}
