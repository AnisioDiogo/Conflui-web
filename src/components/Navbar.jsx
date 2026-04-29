import { Link, useLocation } from 'react-router-dom'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarCheck, Wallet,
  BookOpen, Trophy, Target, LogOut
} from 'lucide-react'

const abas = [
  { nome: 'Início',      path: '/dashboard',  icon: LayoutDashboard },
  { nome: 'Rotina',      path: '/rotina',      icon: CalendarCheck },
  { nome: 'Financeiro',  path: '/financeiro',  icon: Wallet },
  { nome: 'Estudos',     path: '/estudos',     icon: BookOpen },
  { nome: 'Concurso',    path: '/concurso',    icon: Trophy },
  { nome: 'Metas',       path: '/metas',       icon: Target },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { usuario } = useAuth()
  const navigate = useNavigate()

  async function sair() {
    await signOut(auth)
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4">

        {/* Topo */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-medium">V</span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              Olá, {usuario?.displayName?.split(' ')[0]}
            </span>
          </div>
          <button
            onClick={sair}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>

        {/* Abas */}
        <nav className="flex gap-0.5 pb-0 overflow-x-auto scrollbar-hide">
          {abas.map(({ nome, path, icon: Icon }) => {
            const ativo = pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  ativo
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={14} />
                {nome}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}