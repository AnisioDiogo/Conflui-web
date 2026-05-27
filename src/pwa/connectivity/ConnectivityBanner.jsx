import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from '../../context/ToastContext'

/**
 * ConnectivityBanner
 *
 * - Exibe um banner fixo no topo quando offline
 * - Dispara um toast quando a conexão muda
 * - Não renderiza nada quando online (sem impacto visual)
 */
export default function ConnectivityBanner() {
  const online       = useOnlineStatus()
  const { addToast } = useToast()
  const isFirst      = useRef(true)   // evita toast na montagem inicial

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }

    if (online) {
      addToast('Conexão restaurada! Sincronizando dados…', 'success', 4000)
    } else {
      addToast('Você está offline. Alterações serão sincronizadas ao reconectar.', 'warning', 0) // 0 = permanente
    }
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline-banner"
          initial={{ y: -52, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: -52, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="
            fixed top-0 left-0 right-0 z-[500]
            flex items-center justify-center gap-2
            bg-amber-500 text-white
            text-[13px] font-semibold
            py-2.5 px-4
            shadow-lg
          "
        >
          <WifiOff size={14} className="flex-shrink-0" />
          Sem conexão — modo offline ativo
        </motion.div>
      )}
    </AnimatePresence>
  )
}
