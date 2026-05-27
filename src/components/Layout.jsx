import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'

/**
 * Layout principal do app.
 *
 * Desktop (≥1024px): sidebar fixa à esquerda, conteúdo recuado por sidebarW px.
 * Mobile (<1024px):  sidebar como overlay, conteúdo ocupa 100% da largura.
 *
 * Todas as páginas autenticadas usam <Layout> no lugar de <Navbar />.
 */
export default function Layout({ children }) {
  const [recolhida, setRecolhida] = useState(() => {
    try { return localStorage.getItem('sidebar') === 'recolhida' }
    catch { return false }
  })

  const sidebarW = recolhida ? 68 : 220

  // Injeta a largura da sidebar como CSS custom property → usada pela regra .layout-content
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', `${sidebarW}px`)
    try { localStorage.setItem('sidebar', recolhida ? 'recolhida' : 'expandida') }
    catch { /* silent */ }
  }, [sidebarW, recolhida])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar recolhida={recolhida} onToggle={() => setRecolhida(r => !r)} />

      {/* layout-content: em desktop recua pelo valor de --sidebar-w, no mobile fica em 0 */}
      <div className="layout-content transition-all duration-300 ease-in-out">
        {/* Espaço para o botão hamburger no mobile */}
        <div className="h-[52px] lg:hidden" />
        {children}
      </div>
    </div>
  )
}
