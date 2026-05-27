import { useState, useEffect } from 'react'

/**
 * Gerencia o prompt nativo de instalação do PWA (beforeinstallprompt).
 *
 * Retorna:
 *   canInstall  — true se há prompt disponível e não está instalado
 *   install()   — aciona o prompt nativo
 *   installed   — true se o app já está em modo standalone
 *   dismissed   — true se o usuário fechou o banner manualmente
 *   dismiss()   — fecha e salva preferência por 7 dias
 */
export function useInstallPrompt() {
  const [prompt,    setPrompt]    = useState(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Verifica se já está em standalone (instalado)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true // iOS Safari
    if (standalone) { setInstalled(true); return }

    // Verifica se o usuário já dispensou recentemente (7 dias)
    try {
      const ts = localStorage.getItem('pwa_banner_dismissed')
      if (ts && Date.now() - Number(ts) < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true)
      }
    } catch { /* silent */ }

    // Captura o evento beforeinstallprompt
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
    }

    // Detecta instalação concluída
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!prompt) return
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
    } catch { /* usuário cancelou */ }
    setPrompt(null)
  }

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem('pwa_banner_dismissed', String(Date.now()))
    } catch { /* silent */ }
  }

  const canInstall = !!prompt && !installed && !dismissed

  return { canInstall, install, installed, dismissed, dismiss }
}
