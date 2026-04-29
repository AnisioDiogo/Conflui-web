import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore'

const areas = ['Financeiro', 'Estudo', 'Saúde', 'Carreira', 'Pessoal']

const corArea = {
  Financeiro: 'bg-green-50 text-green-600',
  Estudo: 'bg-blue-50 text-blue-600',
  Saúde: 'bg-red-50 text-red-500',
  Carreira: 'bg-amber-50 text-amber-600',
  Pessoal: 'bg-purple-50 text-purple-600'
}

export default function Metas() {
  const { usuario } = useAuth()
  const [metas, setMetas] = useState([])
  const [titulo, setTitulo] = useState('')
  const [prazo, setPrazo] = useState('')
  const [area, setArea] = useState('Financeiro')
  const [salvando, setSalvando] = useState(false)

  const colecao = collection(db, 'usuarios', usuario.uid, 'metas')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm'))
    const unsub = onSnapshot(q, snap => {
      setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  async function adicionar() {
    if (!titulo.trim()) return
    setSalvando(true)
    await addDoc(colecao, {
      titulo, prazo, area,
      feito: false,
      criadoEm: Date.now()
    })
    setTitulo('')
    setPrazo('')
    setSalvando(false)
  }

  async function toggleFeito(meta) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'metas', meta.id), {
      feito: !meta.feito
    })
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'metas', id))
  }

  const ativas = metas.filter(m => !m.feito)
  const concluidas = metas.filter(m => m.feito)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-medium text-gray-800 mb-1">Metas</h1>
        <p className="text-sm text-gray-400 mb-6">
          {ativas.length} ativas · {concluidas.length} conquistadas
        </p>

        {/* Formulário */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Qual é sua meta?"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="month"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={prazo}
              onChange={e => setPrazo(e.target.value)}
            />
            <select
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={area}
              onChange={e => setArea(e.target.value)}
            >
              {areas.map(a => <option key={a}>{a}</option>)}
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

        {/* Metas ativas */}
        {ativas.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">Ativas</p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {ativas.map((meta, i) => (
                <div key={meta.id} className={`flex items-center gap-3 px-4 py-3 ${i < ativas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleFeito(meta)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{meta.titulo}</p>
                    {meta.prazo && (
                      <p className="text-xs text-gray-400">
                        Prazo: {new Date(meta.prazo + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corArea[meta.area]}`}>
                    {meta.area}
                  </span>
                  <button onClick={() => deletar(meta.id)} className="text-gray-200 hover:text-red-400 text-xs transition">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metas concluídas */}
        {concluidas.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">Conquistadas 🏆</p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {concluidas.map((meta, i) => (
                <div key={meta.id} className={`flex items-center gap-3 px-4 py-3 ${i < concluidas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleFeito(meta)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 line-through truncate">{meta.titulo}</p>
                  </div>
                  <button onClick={() => deletar(meta.id)} className="text-gray-200 hover:text-red-400 text-xs transition">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!metas.length && (
          <div className="text-center py-16 text-gray-300 text-sm">
            Nenhuma meta cadastrada ainda
          </div>
        )}

      </div>
    </div>
  )
}