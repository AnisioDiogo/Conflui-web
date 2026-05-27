import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, X, Sparkles } from 'lucide-react'
import { useAppUpdate } from './useAppUpdate'

/**
 * UpdateToast
 *
 * Aparece quando o Service Worker detecta uma nova versão disponível.
 * Permite que o usuário atualize na hora ou ignore (atualizará no próximo reload).
 */
export default function UpdateToast() {
  const { needRefresh, updateServiceWorker } = useAppUpdate()

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          key="update-toast"
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 20, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="
            fixed bottom-24 left-6 z-[400]
            w-72
            bg-white dark:bg-slate-800
            rounded-2xl
            border border-slate-100 dark:border-slate-700
            shadow-2xl shadow-slate-900/15
            px-4 py-3.5
            flex items-start gap-3
          "
        >
          {/* Ícone */}
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={15} className="text-violet-500" />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              Nova versão disponível
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 mb-2.5">
              Clique para atualizar agora
            </p>

            <button
              onClick={() => updateServiceWorker(true)}
              className="
                flex items-center gap-1.5
                bg-violet-600 hover:bg-violet-700
                text-white text-xs font-semibold
                px-3 py-1.5 rounded-lg
                transition w-full justify-center
              "
            >
              <RefreshCw size={11} />
              Atualizar Conflui
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
