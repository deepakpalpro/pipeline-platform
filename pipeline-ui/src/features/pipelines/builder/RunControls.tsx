type Props = {
  canRun: boolean
  saving?: boolean
  running?: boolean
  onDryRun: () => void
  onSave: () => void
  onRun: () => void
}

export function RunControls({
  canRun,
  saving,
  running,
  onDryRun,
  onSave,
  onRun,
}: Props) {
  return (
    <div className="run-controls" aria-label="Run controls">
      <button type="button" className="secondary" onClick={onDryRun} disabled={!canRun || running}>
        Dry Run
      </button>
      <button type="button" className="secondary" onClick={onSave} disabled={saving || !canRun}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onRun} disabled={!canRun || running || saving}>
        {running ? 'Running…' : 'Run'}
      </button>
    </div>
  )
}
