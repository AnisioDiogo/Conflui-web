import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Detecta quando uma nova versão do Service Worker está disponível.
 *
 * Retorna:
 *   needRefresh       — true quando há update pronto para aplicar
 *   updateServiceWorker() — aplica o update e recarrega
 *
 * Uso: chamar updateServiceWorker(true) para forçar o reload.
 */
export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(sw) {
      // Verifica por updates a cada 60 minutos em produção
      if (sw) {
        setInterval(() => sw.update(), 60 * 60 * 1000)
      }
    },
    onRegisterError(err) {
      console.warn('[PWA] Erro ao registrar SW:', err)
    },
  })

  return { needRefresh, updateServiceWorker }
}
