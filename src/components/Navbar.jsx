import { Link, useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard, CalendarCheck, Wallet,
  BookOpen, Trophy, Target, LogOut, Sun, Moon
} from 'lucide-react'

const abas = [
  { nome: 'Início',     path: '/dashboard', icon: LayoutDashboard },
  { nome: 'Rotina',     path: '/rotina',    icon: CalendarCheck },
  { nome: 'Financeiro', path: '/financeiro', icon: Wallet },
  { nome: 'Estudos',    path: '/estudos',   icon: BookOpen },
  { nome: 'Concurso',   path: '/concurso',  icon: Trophy },
  { nome: 'Metas',      path: '/metas',     icon: Target },
]

function Avatar({ nome, foto }) {
  const inicial = nome?.charAt(0)?.toUpperCase() || '?'

  if (foto) {
    return (
      <img
        src={foto}
        alt={nome || 'avatar'}
        className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-100"
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
      <span className="text-white text-xs font-bold leading-none">{inicial}</span>
    </div>
  )
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { usuario, foto } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const primeiroNome = usuario?.displayName?.split(' ')[0] || 'Você'

  async function sair() {
    await signOut(auth)
    navigate('/')
  }

  return (
    <header
      className="sticky top-0 z-10 border-b border-slate-100"
      style={{
        background: dark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div className="max-w-2xl mx-auto px-4">

        {/* Topo — avatar clicável + nome + controles */}
        <div className="flex items-center justify-between py-3">
          <button
            onClick={() => navigate('/perfil')}
            className="flex items-center gap-2.5 hover:opacity-75 transition"
            title="Ver perfil"
          >
            <Avatar nome={usuario?.displayName} foto={foto} />
            <span className="text-sm font-semibold text-slate-700">
              Olá, {primeiroNome}
            </span>
          </button>

          <div className="flex items-center gap-1">
            {/* Toggle dark mode */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              onClick={sair}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition px-2 py-1 rounded-lg hover:bg-slate-50"
            >
              <LogOut size={13} />
              Sair
            </button>
          </div>
        </div>

        {/* Abas de navegação */}
        <nav className="flex overflow-x-auto scrollbar-hide -mx-1 px-1">
          {abas.map(({ nome, path, icon: Icon }) => {
            const ativo = pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all rounded-t-lg ${
                  ativo
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/60'
                }`}
              >
                <Icon size={13} />
                {nome}
              </Link>
            )
          })}
        </nav>

      </div>
    </header>
  )
}
