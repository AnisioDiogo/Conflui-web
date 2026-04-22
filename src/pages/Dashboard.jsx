import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { usuario } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-medium text-gray-800 mb-1">
          Bom dia, {usuario?.displayName?.split(' ')[0]}!
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: 'Tarefas hoje', valor: '0/0', cor: 'blue' },
            { label: 'Saldo do mês', valor: 'R$ 0,00', cor: 'green' },
            { label: 'Estudos pendentes', valor: '0', cor: 'purple' },
            { label: 'Metas ativas', valor: '0', cor: 'amber' },
            { label: 'Dias pro concurso', valor: '--', cor: 'red' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{c.label}</p>
              <p className="text-2xl font-medium text-gray-800">{c.valor}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Assistente IA</p>
          <p className="text-sm text-gray-400">Em breve — fale ou digite e o app organiza tudo pra você automaticamente.</p>
        </div>
      </div>
    </div>
  )
}