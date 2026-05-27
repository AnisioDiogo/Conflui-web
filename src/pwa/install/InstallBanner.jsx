import { AnimatePresence, motion } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'
import { useInstallPrompt } from './useInstallPrompt'

/**
 * InstallBanner
 *
 * Banner premium para instalar o Conflui como PWA.
 * Aparece na parte inferior da tela (não compete com o conteúdo).
 * Desaparece automaticamente após instalação ou ao ser dispensado.
 */
export default function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt()

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          key="install-banner"
          initial={{ y: 96, opacity: 0, scale: 0.96 }}
          animate={{ y: 0,  opacity: 1, scale: 1    }}
          exit={{    y: 96, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="
            fixed bottom-6 left-1/2 z-[400]
            -translate-x-1/2
            w-[calc(100%-2rem)] max-w-sm
            bg-white dark:bg-slate-800
            rounded-2xl
            border border-slate-100 dark:border-slate-700
            shadow-2xl shadow-slate-900/15
            px-4 py-4
            flex items-center gap-3
          "
        >
          {/* Ícone */}
          <div className="
            w-10 h-10 rounded-xl flex-shrink-0
            bg-blue-600 flex items-center justify-center
            shadow-sm shadow-blue-200
          ">
            <Smartphone size={18} className="text-white" />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              Instalar Conflui
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
              Acesso rápido, offline e sem navegador
            </p>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={install}
              className="
                flex items-center gap-1.5
                bg-blue-600 hover:bg-blue-700
                text-white text-xs font-semibold
                px-3 py-2 rounded-xl
                transition shadow-sm shadow-blue-100
              "
            >
              <Download size={12} />
              Instalar
            </button>
            <button
              onClick={dismiss}
              className="
                w-8 h-8 rounded-xl
                hover:bg-slate-100 dark:hover:bg-slate-700
                flex items-center justify-center
                text-slate-400 hover:text-slate-600
                transition flex-shrink-0
              "
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
