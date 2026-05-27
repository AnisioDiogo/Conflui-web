import { useState, useEffect } from 'react'

/**
 * Detecta se o usuário está online ou offline.
 * Sincroniza com os eventos `online` / `offline` do browser.
 *
 * @returns {boolean} true = online, false = offline
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const goOnline  = () => setOnline(true)
    const goOffline = () => setOnline(false)

    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
