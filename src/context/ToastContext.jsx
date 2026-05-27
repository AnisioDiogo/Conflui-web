import { createContext, useContext, useState, useCallback } from 'react'

// ── Contexto ──────────────────────────────────────────────────────────────────

const ToastContext = createContext({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  /**
   * addToast(mensagem, tipo?, duracao?)
   * tipo: 'success' | 'error' | 'warning' | 'info'
   */
  const addToast = useCallback((mensagem, tipo = 'info', duracao = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, mensagem, tipo }])
    if (duracao > 0) setTimeout(() => remove(id), duracao)
    return id
  }, [remove])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Container de toasts importado dinamicamente para evitar ciclo */}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

// ── Container inline (evita import circular) ──────────────────────────────────

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const CONFIG = {
  success: {
    border: 'border-l-emerald-400',
    icon:   CheckCircle2,
    iconCls:'text-emerald-500',
    bg:     'bg-emerald-50/30',
  },
  error: {
    border: 'border-l-rose-400',
    icon:   XCircle,
    iconCls:'text-rose-500',
    bg:     'bg-rose-50/30',
  },
  warning: {
    border: 'border-l-amber-400',
    icon:   AlertTriangle,
    iconCls:'text-amber-500',
    bg:     'bg-amber-50/30',
  },
  info: {
    border: 'border-l-blue-400',
    icon:   Info,
    iconCls:'text-blue-500',
    bg:     '',
  },
}

function ToastItem({ id, mensagem, tipo, onRemove }) {
  const cfg = CONFIG[tipo] || CONFIG.info
  const Icon = cfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{    opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`
        relative flex items-start gap-3 w-80 rounded-2xl border border-slate-100
        border-l-4 ${cfg.border} ${cfg.bg}
        bg-white/95 backdrop-blur-xl
        px-4 py-3.5
        shadow-lg shadow-slate-900/10
        select-none
      `}
    >
      <Icon size={16} className={`mt-0.5 flex-shrink-0 ${cfg.iconCls}`} />
      <p className="flex-1 text-sm text-slate-700 leading-snug">{mensagem}</p>
      <button
        onClick={() => onRemove(id)}
        className="text-slate-300 hover:text-slate-500 transition flex-shrink-0 mt-0.5"
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-24 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onRemove={onRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
