import { Link, useLocation } from 'react-router-dom'
import {auth} from '../firebase'
import { signOut } from 'firebase/auth'
import {useAuth} from '../context/AuthContext'
import {useNavigate} from 'react-router-dom'

const abas = [
    { nome: 'Dashboard', path: '/dashboard'},
    { nome: 'Rotina', path: '/rotina'},
    { nome: 'Financeiro', path: '/financeiro'},
    { nome: 'Estudos', path: '/estudos'},
    { nome: 'Concurso', path: '/concurso'},
    { nome: 'Metas', path: '/metas'},
]

export default function Navbar() {
    const {pathname} = useLocation()
    const {usuario} = useAuth()
    const navigate = useNavigate()

    async function sair() {
        await signOut(auth)
        navigate('/')
    }

    return(
       <nav className="bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-gray-800 text-sm">
          Olá, {usuario?.displayName?.split(' ')[0]} 👋
        </span>
        <button onClick={sair} className="text-xs text-gray-400 hover:text-gray-600">
          Sair
        </button>
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
        {abas.map(a => (
          <Link
            key={a.path}
            to={a.path}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
              pathname === a.path
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {a.nome}
          </Link>
        ))}
      </div>
    </nav>
  )
}