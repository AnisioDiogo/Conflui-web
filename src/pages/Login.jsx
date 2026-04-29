import { auth, provider } from '../firebase'
import { signInWithPopup } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Wallet, BookOpen, Trophy } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()

  async function entrarComGoogle() {
    try {
      await signInWithPopup(auth, provider)
      navigate('/dashboard')
    } catch (err) {
      console.error('Erro no login:', err)
    }
  }

  const recursos = [
    { icon: CalendarCheck, texto: 'Rotina diária organizada' },
    { icon: Wallet,        texto: 'Controle financeiro completo' },
    { icon: BookOpen,      texto: 'Gestão de estudos e materiais' },
    { icon: Trophy,        texto: 'Acompanhe seu concurso' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-medium">V</span>
          </div>
          <h1 className="text-2xl font-medium text-gray-800 mb-1">Meu App Vida</h1>
          <p className="text-sm text-gray-400">Sua rotina, finanças e estudos em um só lugar</p>
        </div>

        {/* Recursos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          {recursos.map(({ icon: Icon, texto }, i) => (
            <div key={i} className={`flex items-center gap-3 py-2.5 ${i < recursos.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-blue-500" />
              </div>
              <span className="text-sm text-gray-600">{texto}</span>
            </div>
          ))}
        </div>

        {/* Botão login */}
        <button
          onClick={entrarComGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-3.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google" />
          Entrar com Google
        </button>

        <p className="text-center text-xs text-gray-300 mt-4">
          Seus dados ficam salvos com segurança na sua conta Google
        </p>
      </div>
    </div>
  )
}