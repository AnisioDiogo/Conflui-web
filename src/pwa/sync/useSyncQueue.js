import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from '../connectivity/useOnlineStatus'
import { getPending, dequeue, markFailed, getPendingCount } from './syncQueue'

/**
 * useSyncQueue
 *
 * Hook que:
 * 1. Monitora o status da fila
 * 2. Dispara processamento automático ao reconectar
 * 3. Expõe `processFn` para o app registrar a função de sync real (Firebase)
 *
 * Uso:
 *   const { pendingCount, registerProcessor } = useSyncQueue()
 *   registerProcessor(async (op) => {
 *     // chamar Firebase com op.collection, op.operation, op.payload, op.docId
 *   })
 */
export function useSyncQueue() {
  const online = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(getPendingCount)
  const [syncing,      setSyncing]      = useState(false)
  const [processor,    setProcessor]    = useState(null)

  // Atualiza o contador a cada 5s
  useEffect(() => {
    const id = setInterval(() => setPendingCount(getPendingCount()), 5000)
    return () => clearInterval(id)
  }, [])

  // Dispara sync quando volta online e há processor registrado
  useEffect(() => {
    if (online && processor && getPendingCount() > 0) {
      runSync()
    }
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runSync() {
    if (syncing || !processor) return
    setSyncing(true)

    const ops = getPending()
    for (const op of ops) {
      try {
        await processor(op)
        dequeue(op.id)
      } catch {
        markFailed(op.id)
      }
    }

    setPendingCount(getPendingCount())
    setSyncing(false)
  }

  const registerProcessor = useCallback((fn) => {
    setProcessor(() => fn)
  }, [])

  return { pendingCount, syncing, registerProcessor, runSync }
}
