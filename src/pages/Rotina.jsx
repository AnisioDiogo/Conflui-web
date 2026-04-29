import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore'

const turnos = ['Manhã', 'Tarde', 'Noite']

export default function Rotina() {
  const { usuario } = useAuth()
  const [tarefas, setTarefas] = useState([])
  const [texto, setTexto] = useState('')
  const [turno, setTurno] = useState('Manhã')
  const [salvando, setSalvando] = useState(false)

  const colecao = collection(db, 'usuarios', usuario.uid, 'rotina')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm'))
    const unsub = onSnapshot(q, (snap) => {
      setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  async function adicionar() {
    if (!texto.trim()) return
    setSalvando(true)
    await addDoc(colecao, {
      texto,
      turno,
      feito: false,
      criadoEm: Date.now()
    })
    setTexto('')
    setSalvando(false)
  }

  async function toggleFeito(tarefa) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'rotina', tarefa.id), {
      feito: !tarefa.feito
    })
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'rotina', id))
  }

  const total = tarefas.length
  const feitas = tarefas.filter(t => t.feito).length
  const pct = total ? Math.round(feitas / total * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-medium text-gray-800 mb-1">Rotina do dia</h1>
        <p className="text-sm text-gray-400 mb-6">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Ex: Acordar 6h, Exercício, Leitura..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
            />
            <select
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={turno}
              onChange={e => setTurno(e.target.value)}
            >
              {turnos.map(t => <option key={t}>{t}</option>)}
            </select>
            <button
              onClick={adicionar}
              disabled={salvando}
              className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition"
            >
              {salvando ? '...' : '+ Add'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: pct + '%' }}
              />
            </div>
            <span className="text-xs text-gray-400">{feitas}/{total} feitas</span>
          </div>
        </div>

        {turnos.map(t => {
          const lista = tarefas.filter(x => x.turno === t)
          if (!lista.length) return null
          return (
            <div key={t} className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">{t}</p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {lista.map((tarefa, i) => (
                  <div
                    key={tarefa.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < lista.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={tarefa.feito}
                      onChange={() => toggleFeito(tarefa)}
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm ${tarefa.feito ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                      {tarefa.texto}
                    </span>
                    <button
                      onClick={() => deletar(tarefa.id)}
                      className="text-gray-200 hover:text-red-400 text-xs transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {!tarefas.length && (
          <div className="text-center py-16 text-gray-300 text-sm">
            Nenhuma tarefa ainda — adicione sua primeira rotina!
          </div>
        )}

      </div>
    </div>
  )
}