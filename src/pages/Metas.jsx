import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, query, orderBy, increment
} from 'firebase/firestore'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

const AREAS = ['Financeiro', 'Estudo', 'Saúde', 'Carreira', 'Pessoal']

const COR_AREA = {
  Financeiro: 'bg-green-50 text-green-600 border-green-100',
  Estudo:     'bg-blue-50 text-blue-600 border-blue-100',
  Saúde:      'bg-red-50 text-red-500 border-red-100',
  Carreira:   'bg-amber-50 text-amber-600 border-amber-100',
  Pessoal:    'bg-purple-50 text-purple-600 border-purple-100',
}

function fmt(n) {
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcPct(depositado, alvo) {
  if (!alvo || alvo <= 0) return 0
  return Math.min(100, Math.round(((depositado || 0) / alvo) * 100))
}

// ── Componente do cartão de meta ─────────────────────────────────────────────

function CartaoMeta({
  meta, aberta, depositos, valorDep, notaDep, salvandoDep,
  onToggleAbrir, onAdicionarDeposito, onDeletarDeposito,
  onToggleFeito, onDeletar, setValorDep, setNotaDep
}) {
  const temAlvo = !!meta.valorAlvo
  const pct = calcPct(meta.totalDepositado, meta.valorAlvo)
  const restante = (meta.valorAlvo || 0) - (meta.totalDepositado || 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

      {/* Cabeçalho */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">

          {/* Checkbox só para metas sem valor alvo */}
          {!temAlvo && (
            <input
              type="checkbox"
              checked={meta.feito}
              onChange={onToggleFeito}
              className="w-4 h-4 accent-blue-500 cursor-pointer mt-0.5 flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 mb-1.5">{meta.titulo}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${COR_AREA[meta.area]}`}>
                {meta.area}
              </span>
              {meta.prazo && (
                <span className="text-xs text-gray-400">
                  Prazo: {new Date(meta.prazo + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Botão expandir (só para metas com valor alvo) */}
            {temAlvo && (
              <button
                onClick={onToggleAbrir}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition"
                title={aberta ? 'Fechar' : 'Ver depósitos'}
              >
                {aberta ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            )}
            <button
              onClick={onDeletar}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-200 hover:text-red-400 transition"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Barra de progresso financeiro */}
        {temAlvo && (
          <div className="mt-3">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-semibold text-gray-800">{fmt(meta.totalDepositado)}</span>
              <span className="text-xs text-gray-400">de {fmt(meta.valorAlvo)}</span>
            </div>

            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100 ? 'bg-green-400' :
                  pct >= 50  ? 'bg-blue-500'  : 'bg-blue-300'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className={`text-xs font-bold ${pct === 100 ? 'text-green-500' : 'text-blue-500'}`}>
                {pct}%
              </span>
              {restante > 0 && (
                <span className="text-xs text-gray-400">Faltam {fmt(restante)}</span>
              )}
              {pct === 100 && (
                <span className="text-xs text-green-500 font-medium">Meta atingida! 🎉</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Painel expandido — depósitos */}
      {temAlvo && aberta && (
        <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-4">

          {/* Formulário de novo depósito */}
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Registrar depósito</p>
          <div className="flex gap-2 mb-4">
            <div className="relative w-28 flex-shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">R$</span>
              <input
                className="w-full border border-gray-200 rounded-xl pl-7 pr-2 py-2 text-sm outline-none focus:border-blue-300 bg-white transition"
                placeholder="0,00"
                value={valorDep}
                onChange={e => setValorDep(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onAdicionarDeposito()}
              />
            </div>
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 bg-white transition"
              placeholder="Nota (opcional)"
              value={notaDep}
              onChange={e => setNotaDep(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAdicionarDeposito()}
            />
            <button
              onClick={onAdicionarDeposito}
              disabled={salvandoDep}
              className="w-9 h-9 flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition disabled:opacity-50 shadow-sm"
            >
              {salvandoDep ? '…' : <Plus size={15} />}
            </button>
          </div>

          {/* Histórico */}
          {depositos.length > 0 ? (
            <>
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Histórico</p>
              <div className="space-y-1.5">
                {depositos.map(dep => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-green-600">{fmt(dep.valor)}</span>
                        {dep.nota && (
                          <span className="text-xs text-gray-400 truncate">{dep.nota}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5">
                        {new Date(dep.criadoEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => onDeletarDeposito(dep.id, dep.valor)}
                      className="text-gray-200 hover:text-red-400 transition flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-300 text-center py-3">Nenhum depósito ainda</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function Metas() {
  const { usuario } = useAuth()
  const [metas, setMetas] = useState([])

  // Formulário nova meta
  const [titulo, setTitulo] = useState('')
  const [area, setArea] = useState('Financeiro')
  const [prazo, setPrazo] = useState('')
  const [valorAlvo, setValorAlvo] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Depósitos
  const [metaAberta, setMetaAberta] = useState(null)
  const [depositos, setDepositos] = useState([])
  const [valorDep, setValorDep] = useState('')
  const [notaDep, setNotaDep] = useState('')
  const [salvandoDep, setSalvandoDep] = useState(false)
  const depositoUnsubRef = useRef(null)

  const colecao = collection(db, 'usuarios', usuario.uid, 'metas')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm'))
    return onSnapshot(q, snap =>
      setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // Escuta os depósitos da meta aberta em tempo real
  useEffect(() => {
    depositoUnsubRef.current?.()
    depositoUnsubRef.current = null
    if (!metaAberta) { setDepositos([]); return }

    const q = query(
      collection(db, 'usuarios', usuario.uid, 'metas', metaAberta, 'depositos'),
      orderBy('criadoEm', 'desc')
    )
    const unsub = onSnapshot(q, snap =>
      setDepositos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    depositoUnsubRef.current = unsub
    return unsub
  }, [metaAberta])

  async function adicionar() {
    if (!titulo.trim()) return
    setSalvando(true)
    const alvo = valorAlvo ? parseFloat(valorAlvo.replace(',', '.')) : null
    await addDoc(colecao, {
      titulo, area, prazo,
      valorAlvo: alvo,
      totalDepositado: 0,
      feito: false,
      criadoEm: Date.now()
    })
    setTitulo('')
    setPrazo('')
    setValorAlvo('')
    setSalvando(false)
  }

  async function adicionarDeposito(meta) {
    const v = parseFloat(valorDep.replace(',', '.'))
    if (isNaN(v) || v <= 0) return
    setSalvandoDep(true)

    await addDoc(
      collection(db, 'usuarios', usuario.uid, 'metas', meta.id, 'depositos'),
      { valor: v, nota: notaDep.trim(), criadoEm: Date.now() }
    )

    const novoTotal = (meta.totalDepositado || 0) + v
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'metas', meta.id), {
      totalDepositado: increment(v),
      // Marca como concluída automaticamente ao atingir o alvo
      ...(meta.valorAlvo && novoTotal >= meta.valorAlvo ? { feito: true } : {})
    })

    setValorDep('')
    setNotaDep('')
    setSalvandoDep(false)
  }

  async function deletarDeposito(metaId, depId, valor) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'metas', metaId, 'depositos', depId))
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'metas', metaId), {
      totalDepositado: increment(-valor)
    })
  }

  async function toggleFeito(meta) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'metas', meta.id), { feito: !meta.feito })
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'metas', id))
    if (metaAberta === id) setMetaAberta(null)
  }

  function toggleAbrir(id) {
    setMetaAberta(prev => prev === id ? null : id)
    setValorDep('')
    setNotaDep('')
  }

  const ativas = metas.filter(m => !m.feito)
  const concluidas = metas.filter(m => m.feito)

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-medium text-gray-800 mb-1">Metas</h1>
        <p className="text-sm text-gray-400 mb-6">
          {ativas.length} ativas · {concluidas.length} conquistadas
        </p>

        {/* Formulário nova meta */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-medium text-gray-500 mb-3">Nova meta</p>

          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 mb-2 transition"
            placeholder="Qual é a sua meta?"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionar()}
          />

          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="month"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={prazo}
              onChange={e => setPrazo(e.target.value)}
            />
            <select
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={area}
              onChange={e => setArea(e.target.value)}
            >
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">R$</span>
              <input
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-300 transition"
                placeholder="Valor alvo (opcional)"
                value={valorAlvo}
                onChange={e => setValorAlvo(e.target.value)}
              />
            </div>
            <button
              onClick={adicionar}
              disabled={salvando || !titulo.trim()}
              className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
            >
              {salvando ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Metas ativas */}
        {ativas.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 px-1">Ativas</p>
            <div className="space-y-3">
              {ativas.map(meta => (
                <CartaoMeta
                  key={meta.id}
                  meta={meta}
                  aberta={metaAberta === meta.id}
                  depositos={metaAberta === meta.id ? depositos : []}
                  valorDep={metaAberta === meta.id ? valorDep : ''}
                  notaDep={metaAberta === meta.id ? notaDep : ''}
                  salvandoDep={salvandoDep}
                  onToggleAbrir={() => toggleAbrir(meta.id)}
                  onAdicionarDeposito={() => adicionarDeposito(meta)}
                  onDeletarDeposito={(depId, v) => deletarDeposito(meta.id, depId, v)}
                  onToggleFeito={() => toggleFeito(meta)}
                  onDeletar={() => deletar(meta.id)}
                  setValorDep={setValorDep}
                  setNotaDep={setNotaDep}
                />
              ))}
            </div>
          </div>
        )}

        {/* Metas concluídas */}
        {concluidas.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 px-1">Conquistadas 🏆</p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {concluidas.map((meta, i) => (
                <div
                  key={meta.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < concluidas.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggleFeito(meta)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 line-through truncate">{meta.titulo}</p>
                    {meta.valorAlvo && (
                      <p className="text-xs text-gray-300">{fmt(meta.totalDepositado)} · Meta atingida</p>
                    )}
                  </div>
                  <button
                    onClick={() => deletar(meta.id)}
                    className="text-gray-200 hover:text-red-400 text-xs transition"
                  >
                    ✕
                  </button>
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
    </Layout>
  )
}
