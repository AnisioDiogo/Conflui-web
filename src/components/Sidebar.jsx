import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useModulos, TODOS_MODULOS } from '../context/ModulosContext'
import { useOnlineStatus } from '../pwa/connectivity/useOnlineStatus'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import {
  LayoutDashboard, LogOut,
  ChevronLeft, ChevronRight, Sun, Moon,
  User, Menu, X, Settings, WifiOff,
} from 'lucide-react'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ nome, foto }) {
  const inicial = nome?.charAt(0)?.toUpperCase() || '?'

  if (foto) {
    return (
      <img
        src={foto}
        alt={nome || 'avatar'}
        referrerPolicy="no-referrer"
        className="w-8 h-8 rounded-xl object-cover border-2 border-white/80 shadow-sm flex-shrink-0"
      />
    )
  }

  return (
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
      <span className="text-white text-xs font-bold leading-none">{inicial}</span>
    </div>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ path, label, icon: Icon, cor, ativo, recolhida }) {
  return (
    <Link
      to={path}
      title={recolhida ? label : undefined}
      className={`relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold
        transition-all duration-150 group overflow-hidden
        ${ativo
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }
        ${recolhida ? 'justify-center' : ''}`}
    >
      {/* Indicador ativo — faixa esquerda */}
      {ativo && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
      )}

      <Icon
        size={16}
        className={`flex-shrink-0 transition-colors ${
          ativo ? 'text-blue-600' : `${cor} opacity-70 group-hover:opacity-100`
        }`}
      />

      {!recolhida && (
        <span className="truncate flex-1">{label}</span>
      )}
    </Link>
  )
}

// ── FooterBtn ─────────────────────────────────────────────────────────────────

function FooterBtn({ onClick, to, label, icon: Icon, iconClass = 'text-slate-400', hoverClass = 'hover:bg-slate-50 hover:text-slate-700', ativo = false, recolhida }) {
  const cls = `flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-xs font-semibold
    text-slate-500 transition-all duration-150
    ${ativo ? 'bg-blue-50 text-blue-700' : hoverClass}
    ${recolhida ? 'justify-center' : ''}`

  if (to) {
    return (
      <Link to={to} title={recolhida ? label : undefined} className={cls}>
        <Icon size={15} className={`flex-shrink-0 ${ativo ? 'text-blue-600' : iconClass}`} />
        {!recolhida && <span>{label}</span>}
      </Link>
    )
  }

  return (
    <button onClick={onClick} title={recolhida ? label : undefined} className={cls}>
      <Icon size={15} className={`flex-shrink-0 ${iconClass}`} />
      {!recolhida && <span>{label}</span>}
    </button>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ recolhida, onToggle }) {
  const { pathname }           = useLocation()
  const { usuario, foto }      = useAuth()
  const { dark, toggleTheme }  = useTheme()
  const { moduloAtivo }        = useModulos()
  const navigate               = useNavigate()
  const online                 = useOnlineStatus()
  const [mobileAberta, setMobileAberta] = useState(false)

  const primeiroNome = usuario?.displayName?.split(' ')[0] || 'Você'

  // Itens de navegação principais — filtrados pelos módulos ativos
  const navItems = [
    { label: 'Início', path: '/dashboard', icon: LayoutDashboard, cor: 'text-blue-500' },
    ...TODOS_MODULOS
      .filter(m => !m.emBreve && moduloAtivo(m.id))
      .map(({ label, path, icon, cor }) => ({ label, path, icon, cor })),
  ]

  // Fecha overlay mobile ao navegar
  useEffect(() => { setMobileAberta(false) }, [pathname])

  // Fecha overlay mobile com Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setMobileAberta(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function sair() {
    await signOut(auth)
    navigate('/')
  }

  const W = recolhida ? 68 : 220

  return (
    <>
      {/* ── Overlay mobile ──────────────────────────────────────────────── */}
      {mobileAberta && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileAberta(false)}
        />
      )}

      {/* ── Hamburger mobile ────────────────────────────────────────────── */}
      <button
        onClick={() => setMobileAberta(o => !o)}
        className="fixed top-3.5 left-4 z-50 lg:hidden w-9 h-9 rounded-xl bg-white border border-slate-100 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 transition active:scale-95"
        aria-label="Menu"
      >
        {mobileAberta ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out select-none"
        style={{
          width: W,
          background: dark ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)',
          borderColor: dark ? 'rgba(51,65,85,0.5)' : 'rgba(241,245,249,1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* ── Topo — logo + collapse ──────────────────────────────────── */}
        <div
          className="flex items-center h-[60px] px-3 gap-2 flex-shrink-0 border-b"
          style={{ borderColor: dark ? 'rgba(51,65,85,0.4)' : 'rgba(241,245,249,1)' }}
        >
          {/* Logo + dot de conectividade */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-black leading-none">C</span>
            </div>
            {!online && (
              <span
                title="Offline"
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 flex items-center justify-center"
              />
            )}
          </div>

          {!recolhida && (
            <span className="text-sm font-bold text-slate-800 flex-1 min-w-0 truncate">
              Conflui
            </span>
          )}

          {/* Collapse button — só desktop */}
          <button
            onClick={onToggle}
            className={`hidden lg:flex w-6 h-6 rounded-lg items-center justify-center text-slate-400
              hover:text-slate-600 hover:bg-slate-100 transition flex-shrink-0
              ${recolhida ? 'mx-auto' : 'ml-auto'}`}
            title={recolhida ? 'Expandir' : 'Recolher'}
          >
            {recolhida ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* ── Avatar do usuário ────────────────────────────────────────── */}
        <div
          className="px-2 py-2.5 border-b flex-shrink-0"
          style={{ borderColor: dark ? 'rgba(51,65,85,0.4)' : 'rgba(248,250,252,1)' }}
        >
          <button
            onClick={() => navigate('/perfil')}
            className={`flex items-center gap-2.5 w-full rounded-xl px-2 py-1.5 transition
              hover:bg-slate-50 active:scale-95 ${recolhida ? 'justify-center' : ''}`}
            title={recolhida ? (usuario?.displayName || 'Perfil') : undefined}
          >
            <Avatar nome={usuario?.displayName} foto={foto} />
            {!recolhida && (
              <div className="min-w-0 text-left flex-1">
                <p className="text-xs font-semibold text-slate-700 truncate leading-tight">
                  {primeiroNome}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                  {usuario?.email}
                </p>
              </div>
            )}
          </button>
        </div>

        {/* ── Navegação principal ──────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 scrollbar-hide">
          {!recolhida && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-2">
              Navegação
            </p>
          )}

          <div className="space-y-0.5">
            {navItems.map(item => (
              <NavItem
                key={item.path}
                {...item}
                ativo={pathname === item.path}
                recolhida={recolhida}
              />
            ))}
          </div>
        </nav>

        {/* ── Ações do rodapé ─────────────────────────────────────────── */}
        <div
          className="px-2 py-2 border-t flex-shrink-0 space-y-0.5"
          style={{ borderColor: dark ? 'rgba(51,65,85,0.4)' : 'rgba(248,250,252,1)' }}
        >
          {/* Dark mode toggle */}
          <FooterBtn
            onClick={toggleTheme}
            label={dark ? 'Modo claro' : 'Modo escuro'}
            icon={dark ? Sun : Moon}
            iconClass={dark ? 'text-amber-400' : 'text-slate-400'}
            recolhida={recolhida}
          />

          {/* Configurações */}
          <FooterBtn
            to="/configuracoes"
            label="Configurações"
            icon={Settings}
            ativo={pathname === '/configuracoes'}
            recolhida={recolhida}
          />

          {/* Perfil */}
          <FooterBtn
            to="/perfil"
            label="Perfil"
            icon={User}
            ativo={pathname === '/perfil'}
            recolhida={recolhida}
          />

          {/* Sair */}
          <FooterBtn
            onClick={sair}
            label="Sair"
            icon={LogOut}
            hoverClass="hover:bg-rose-50 hover:text-rose-600"
            recolhida={recolhida}
          />

          {/* Indicador offline */}
          {!online && (
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 mt-1 ${recolhida ? 'justify-center' : ''}`}>
              <WifiOff size={12} className="text-amber-500 flex-shrink-0" />
              {!recolhida && (
                <span className="text-[10px] font-semibold text-amber-600">Offline</span>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile: slide-in / slide-out */}
      <style>{`
        @media (max-width: 1023px) {
          aside {
            transform: ${mobileAberta ? 'translateX(0)' : 'translateX(-100%)'};
            width: 220px !important;
          }
        }
      `}</style>
    </>
  )
}
