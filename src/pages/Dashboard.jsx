import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import Assistente from '../components/Assistente'
import { db } from '../firebase'
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore'

export default function Dashboard() {
  const { usuario } = useAuth()
  const [rotina, setRotina] = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [estudos, setEstudos] = useState([])
  const [metas, setMetas] = useState([])
  const [concurso, setConcurso] = useState(null)

  function mesAtual() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  // Buscar todos os dados em tempo real
  useEffect(() => {
    const uid = usuario.uid

    // Rotina
    const unsubRotina = onSnapshot(
      query(collection(db, 'usuarios', uid, 'rotina'), orderBy('criadoEm')),
      snap => setRotina(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    // Financeiro
    const unsubFin = onSnapshot(
      query(collection(db, 'usuarios', uid, 'financeiro'), orderBy('criadoEm')),
      snap => setFinanceiro(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    // Estudos
    const unsubEst = onSnapshot(
      query(collection(db, 'usuarios', uid, 'estudos'), orderBy('criadoEm')),
      snap => setEstudos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    // Metas
    const unsubMet = onSnapshot(
      query(collection(db, 'usuarios', uid, 'metas'), orderBy('criadoEm')),
      snap => setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    // Concurso
    getDoc(doc(db, 'usuarios', uid, 'concurso', 'dados')).then(snap => {
      if (snap.exists()) setConcurso(snap.data())
    })

    return () => {
      unsubRotina()
      unsubFin()
      unsubEst()
      unsubMet()
    }
  }, [])

  // Calcular dados
  const totalTarefas = rotina.length
  const tarefasFeitas = rotina.filter(t => t.feito).length
  const pctRotina = totalTarefas ? Math.round(tarefasFeitas / totalTarefas * 100) : 0

  const doMes = financeiro.filter(l => l.mes === mesAtual())
  const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo = entradas - saidas

  const estudosPendentes = estudos.filter(e => !e.feito).length
  const metasAtivas = metas.filter(m => !m.feito).length
  const metasConcluidas = metas.filter(m => m.feito).length

  function diasRestantes() {
    if (!concurso?.dataProva) return null
    const diff = Math.ceil((new Date(concurso.dataProva + 'T00:00:00') - new Date()) / 86400000)
    return diff > 0 ? diff : 0
  }

  const dias = diasRestantes()

  function fmt(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function saudacao() {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        {/* Cabeçalho */}
        <h1 className="text-xl font-medium text-gray-800 mb-1">
          {saudacao()}, {usuario?.displayName?.split(' ')[0]}!
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Rotina do dia */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Rotina de hoje</p>
            <span className="text-xs text-gray-400">{tarefasFeitas}/{totalTarefas} feitas</span>
          </div>
          {totalTarefas === 0 ? (
            <p className="text-sm text-gray-300">Nenhuma tarefa adicionada ainda</p>
          ) : (
            <>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: pctRotina + '%',
                    background: pctRotina === 100 ? '#22c55e' : '#60a5fa'
                  }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {pctRotina === 100
                  ? 'Parabéns! Todas as tarefas concluídas!'
                  : `${pctRotina}% concluído`}
              </p>
            </>
          )}
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* Saldo */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Saldo do mês</p>
            <p className={`text-lg font-medium ${saldo >= 0 ? 'text-green-600' : 'text-red-400'}`}>
              {fmt(saldo)}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {fmt(entradas)} entrada · {fmt(saidas)} saída
            </p>
          </div>

          {/* Estudos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Estudos</p>
            <p className="text-lg font-medium text-gray-800">{estudosPendentes}</p>
            <p className="text-xs text-gray-300 mt-1">
              {estudosPendentes === 1 ? 'material pendente' : 'materiais pendentes'}
            </p>
          </div>

          {/* Metas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Metas</p>
            <p className="text-lg font-medium text-gray-800">{metasAtivas}</p>
            <p className="text-xs text-gray-300 mt-1">
              {metasConcluidas > 0 ? `${metasConcluidas} conquistada${metasConcluidas > 1 ? 's' : ''}` : 'ativas'}
            </p>
          </div>

          {/* Concurso */}
          <div className={`rounded-2xl border p-4 ${dias !== null && dias <= 30 ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'}`}>
            <p className="text-xs text-gray-400 mb-1">Concurso</p>
            {dias === null ? (
              <p className="text-sm text-gray-300">Não configurado</p>
            ) : (
              <>
                <p className={`text-lg font-medium ${dias <= 7 ? 'text-red-500' : dias <= 30 ? 'text-amber-600' : 'text-gray-800'}`}>
                  {dias} dias
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">{concurso?.nome || 'pra prova'}</p>
              </>
            )}
          </div>

        </div>

        {/* Atividade recente */}
        {financeiro.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Últimos lançamentos</p>
            {financeiro.slice(-3).reverse().map((l, i) => (
              <div key={l.id} className={`flex items-center gap-3 py-2 ${i < 2 ? 'border-b border-gray-50' : ''}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.tipo === 'entrada' ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="flex-1 text-sm text-gray-600 truncate">{l.desc}</span>
                <span className={`text-sm font-medium ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-400'}`}>
                  {l.tipo === 'entrada' ? '+' : '-'}{fmt(l.valor)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Próximas metas */}
        {metasAtivas > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-700 mb-3">Metas ativas</p>
            {metas.filter(m => !m.feito).slice(0, 3).map((m, i, arr) => (
              <div key={m.id} className={`flex items-center gap-3 py-2 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-600 truncate">{m.titulo}</span>
                {m.prazo && (
                  <span className="text-xs text-gray-300">
                    {new Date(m.prazo + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
          <div className="mt-4">
            <Assistente />
  

        </div>
      </div>
    </div>
  )
}