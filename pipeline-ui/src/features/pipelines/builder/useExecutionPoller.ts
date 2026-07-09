import { useEffect, useRef, useState } from 'react'
import { getPipelineExecution } from '../../../api/resources'
import type { PipelineExecutionDetail } from '../../../api/types'
import { isTerminalExecutionStatus } from './executionOverlayReducer'

type Options = {
  tenantId: string
  pipelineId: string | null
  executionId: string | null
  enabled?: boolean
  intervalMs?: number
  maxAttempts?: number
}

export function useExecutionPoller({
  tenantId,
  pipelineId,
  executionId,
  enabled = true,
  intervalMs = 200,
  maxAttempts = 20,
}: Options) {
  const [execution, setExecution] = useState<PipelineExecutionDetail | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const attempts = useRef(0)

  useEffect(() => {
    if (!enabled || !pipelineId || !executionId) {
      return
    }
    attempts.current = 0
    setError(null)
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      try {
        const result = await getPipelineExecution(
          tenantId,
          pipelineId!,
          executionId!,
        )
        if (cancelled) {
          return
        }
        setExecution(result)
        attempts.current += 1
        if (
          isTerminalExecutionStatus(result.status) ||
          attempts.current >= maxAttempts
        ) {
          return
        }
        timer = setTimeout(() => {
          void tick()
        }, intervalMs)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Poll failed')
        }
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [
    tenantId,
    pipelineId,
    executionId,
    enabled,
    intervalMs,
    maxAttempts,
  ])

  return { execution, error }
}
