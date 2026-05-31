import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useOnlineStatus — detecta conectividade de forma robusta.
 *
 * POR QUÊ navigator.onLine É INSUFICIENTE:
 * - No Android PWA, pode retornar false ao abrir o app recém-instalado
 * - Em redes com captive portal, reporta true sem internet real
 * - No Android PWA standalone, pode ter leitura errada no boot
 *
 * ESTRATÉGIA:
 * 1. Inicia com navigator.onLine como valor imediato
 * 2. Ouve os eventos online/offline do browser
 * 3. Quando "online" dispara, faz probe real (fetch HEAD no ícone local)
 *    para confirmar internet antes de marcar como online
 * 4. Revalida a cada 30s para detectar perda silenciosa de conexão
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const probeTimer = useRef(null)

  // Probe real de conectividade — sem cache, sem depender de APIs externas
  const probeConnectivity = useCallback(async () => {
    try {
      const res = await fetch('/icons/icon.svg', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      const isOnline = res.ok || res.type === 'opaque'
      setOnline(isOnline)
      return isOnline
    } catch {
      setOnline(false)
      return false
    }
  }, [])

  useEffect(() => {
    // Probe imediato ao montar — corrige estado inicial no Android PWA
    probeConnectivity()

    const goOffline = () => {
      setOnline(false)
      if (probeTimer.current) clearInterval(probeTimer.current)
    }

    const goOnline = async () => {
      // Evento 'online' não garante internet real — confirma com probe
      const real = await probeConnectivity()
      if (real) {
        probeTimer.current = setInterval(probeConnectivity, 30_000)
      }
    }

    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)

    // Revalida periodicamente enquanto o app está aberto
    probeTimer.current = setInterval(probeConnectivity, 30_000)

    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
      if (probeTimer.current) clearInterval(probeTimer.current)
    }
  }, [probeConnectivity])

  return online
}
