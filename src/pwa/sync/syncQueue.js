/**
 * SyncQueue — Fila de sincronização offline-first
 *
 * Arquitetura: localStorage como store primário (rápido, sem async).
 * Pronto para migrar para IndexedDB com mínima mudança de API.
 *
 * Cada operação tem a forma:
 * {
 *   id:         number   — timestamp único
 *   ts:         string   — ISO timestamp
 *   collection: string   — ex: 'rotina', 'financeiro'
 *   operation:  string   — 'add' | 'update' | 'delete'
 *   docId?:     string   — ID do documento (update/delete)
 *   payload?:   object   — dados (add/update)
 *   retries:    number   — tentativas já feitas
 *   status:     string   — 'pending' | 'syncing' | 'failed'
 * }
 */

const QUEUE_KEY   = 'conflui_sync_queue'
const MAX_RETRIES = 5

// ── Helpers de storage ────────────────────────────────────────────────────────

function read() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

function write(queue) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) } catch { /* silent */ }
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Adiciona uma operação pendente à fila.
 */
export function enqueue({ collection, operation, docId = null, payload = null }) {
  const queue = read()
  queue.push({
    id: Date.now() + Math.random(),
    ts: new Date().toISOString(),
    collection,
    operation,
    docId,
    payload,
    retries: 0,
    status: 'pending',
  })
  write(queue)
}

/**
 * Retorna todas as operações pendentes.
 */
export function getQueue() {
  return read()
}

/**
 * Retorna apenas operações com status 'pending'.
 */
export function getPending() {
  return read().filter(op => op.status === 'pending')
}

/**
 * Remove uma operação da fila (após sync bem-sucedido).
 */
export function dequeue(id) {
  write(read().filter(op => op.id !== id))
}

/**
 * Marca uma operação como falha (incrementa retries).
 * Se exceder MAX_RETRIES, muda status para 'failed'.
 */
export function markFailed(id) {
  const queue = read().map(op => {
    if (op.id !== id) return op
    const retries = (op.retries || 0) + 1
    return { ...op, retries, status: retries >= MAX_RETRIES ? 'failed' : 'pending' }
  })
  write(queue)
}

/**
 * Limpa toda a fila (reset manual).
 */
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

/**
 * Conta itens pendentes (para badge/indicador visual).
 */
export function getPendingCount() {
  return getPending().length
}
