import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore'

const TIPOS_SUGESTOES = ['Artigo', 'Vídeo', 'Livro', 'Revisão', 'Exercício', 'Podcast', 'Curso']
const prioridades = ['Alta', 'Média', 'Baixa']

const corPrioridade = {
  Alta:  'bg-red-50 text-red-500',
  Média: 'bg-amber-50 text-amber-500',
  Baixa: 'bg-green-50 text-green-600'
}

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Estudos() {
  const { usuario } = useAuth()
  const [itens, setItens] = useState([])
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('Artigo')
  const [tipoCustom, setTipoCustom] = useState(false)
  const [prioridade, setPrioridade] = useState('Alta')
  const [dataEstudo, setDataEstudo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const colecao = collection(db, 'usuarios', usuario.uid, 'estudos')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap =>
      setItens(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // Tipos usados pelo usuário + sugestões padrão (sem duplicatas)
  const tiposDisponiveis = useMemo(() => {
    const s = new Set(TIPOS_SUGESTOES)
    itens.forEach(i => { if (i.tipo) s.add(i.tipo) })
    return [...s]
  }, [itens])

  async function adicionar() {
    if (!titulo.trim() || !tipo.trim()) return
    setSalvando(true)
    await addDoc(colecao, {
      titulo, tipo, prioridade,
      dataEstudo: dataEstudo || null,
      feito: false,
      criadoEm: Date.now()
    })
    setTitulo('')
    setDataEstudo('')
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

  const pendentes  = itens.filter(i => !i.feito)
  const concluidos = itens.filter(i => i.feito)

  const hoje = hojeISO()

  function labelData(dataEstudo) {
    if (!dataEstudo) return null
    if (dataEstudo < hoje) return { txt: dataEstudo.split('-').reverse().join('/'), cls: 'text-red-400' }
    if (dataEstudo === hoje) return { txt: 'Hoje', cls: 'text-blue-500' }
    return { txt: dataEstudo.split('-').reverse().join('/'), cls: 'text-slate-400' }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-bold text-slate-800 mb-1">Estudos</h1>
        <p className="text-sm text-slate-400 mb-6">
          {pendentes.length} pendentes · {concluidos.length} concluídos
        </p>

        {/* Formulário */}
        <div className="card p-4 mb-6">

          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition mb-2 placeholder:text-slate-300"
            placeholder="Título ou assunto para estudar..."
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionar()}
          />

          {/* Tipo: input livre OU sugestões */}
          <div className="mb-2">
            {tipoCustom ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition placeholder:text-slate-300"
                  placeholder="Digite o tipo (ex: Mapa mental, Simulado...)"
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => { setTipoCustom(false); setTipo('Artigo') }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2"
                >
                  ← Sugestões
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tiposDisponiveis.map(t => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                      tipo === t
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={() => { setTipoCustom(true); setTipo('') }}
                  className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition"
                >
                  + Novo tipo
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <select
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={prioridade}
              onChange={e => setPrioridade(e.target.value)}
            >
              {prioridades.map(p => <option key={p}>{p}</option>)}
            </select>

            <input
              type="date"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none text-slate-600"
              value={dataEstudo}
              onChange={e => setDataEstudo(e.target.value)}
              title="Data para estudar (opcional)"
            />

            <button
              onClick={adicionar}
              disabled={salvando || !titulo.trim() || !tipo.trim()}
              className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
            >
              {salvando ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Lista pendentes */}
        {pendentes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 px-1">Pendentes</p>
            <div className="card overflow-hidden">
              {pendentes.map((item, i) => {
                const dl = labelData(item.dataEstudo)
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < pendentes.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleFeito(item)}
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{item.titulo}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">{item.tipo}</p>
                        {dl && <p className={`text-xs ${dl.cls}`}>· {dl.txt}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corPrioridade[item.prioridade]}`}>
                      {item.prioridade}
                    </span>
                    <button onClick={() => deletar(item.id)} className="text-slate-200 hover:text-red-400 text-xs transition">✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lista concluídos */}
        {concluidos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 px-1">Concluídos</p>
            <div className="card overflow-hidden">
              {concluidos.map((item, i) => (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < concluidos.length - 1 ? 'border-b border-slate-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleFeito(item)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 line-through truncate">{item.titulo}</p>
                    <p className="text-xs text-slate-300">{item.tipo}</p>
                  </div>
                  <button onClick={() => deletar(item.id)} className="text-slate-200 hover:text-red-400 text-xs transition">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!itens.length && (
          <div className="text-center py-16 text-slate-300 text-sm">
            Nenhum material adicionado ainda
          </div>
        )}

      </div>
    </Layout>
  )
}
