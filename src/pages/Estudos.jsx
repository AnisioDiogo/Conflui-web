import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore'

const tipos = ['Artigo', 'Vídeo', 'Livro', 'Revisão', 'Exercício']
const prioridades = ['Alta', 'Média', 'Baixa']

const corPrioridade = {
  Alta: 'bg-red-50 text-red-500',
  Média: 'bg-amber-50 text-amber-500',
  Baixa: 'bg-green-50 text-green-600'
}

export default function Estudos() {
  const { usuario } = useAuth()
  const [itens, setItens] = useState([])
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('Artigo')
  const [prioridade, setPrioridade] = useState('Alta')
  const [salvando, setSalvando] = useState(false)

  const colecao = collection(db, 'usuarios', usuario.uid, 'estudos')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setItens(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  async function adicionar() {
    if (!titulo.trim()) return
    setSalvando(true)
    await addDoc(colecao, {
      titulo, tipo, prioridade,
      feito: false,
      criadoEm: Date.now()
    })
    setTitulo('')
    setSalvando(false)
  }

  async function toggleFeito(item) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'estudos', item.id), {
      feito: !item.feito
    })
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'estudos', id))
  }

  const pendentes = itens.filter(i => !i.feito)
  const concluidos = itens.filter(i => i.feito)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-medium text-gray-800 mb-1">Estudos</h1>
        <p className="text-sm text-gray-400 mb-6">
          {pendentes.length} pendentes · {concluidos.length} concluídos
        </p>

        {/* Formulário */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Título ou assunto para estudar..."
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={tipo}
              onChange={e => setTipo(e.target.value)}
            >
              {tipos.map(t => <option key={t}>{t}</option>)}
            </select>
            <select
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={prioridade}
              onChange={e => setPrioridade(e.target.value)}
            >
              {prioridades.map(p => <option key={p}>{p}</option>)}
            </select>
            <button
              onClick={adicionar}
              disabled={salvando}
              className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition"
            >
              {salvando ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Lista pendentes */}
        {pendentes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">Pendentes</p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {pendentes.map((item, i) => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < pendentes.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleFeito(item)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{item.titulo}</p>
                    <p className="text-xs text-gray-400">{item.tipo}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corPrioridade[item.prioridade]}`}>
                    {item.prioridade}
                  </span>
                  <button onClick={() => deletar(item.id)} className="text-gray-200 hover:text-red-400 text-xs transition">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista concluídos */}
        {concluidos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">Concluídos</p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {concluidos.map((item, i) => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < concluidos.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleFeito(item)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 line-through truncate">{item.titulo}</p>
                    <p className="text-xs text-gray-300">{item.tipo}</p>
                  </div>
                  <button onClick={() => deletar(item.id)} className="text-gray-200 hover:text-red-400 text-xs transition">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!itens.length && (
          <div className="text-center py-16 text-gray-300 text-sm">
            Nenhum material adicionado ainda
          </div>
        )}

      </div>
    </div>
  )
}