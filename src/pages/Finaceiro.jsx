import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  deleteDoc, updateDoc, doc, query, orderBy, writeBatch
} from 'firebase/firestore'

const categorias = {
  entrada: ['Salário', 'Freelance', 'Presente', 'Outro'],
  saida: ['Alimentação', 'Transporte', 'Estudo', 'Saúde', 'Lazer', 'Contas', 'Cartão', 'Outro']
}

function fmt(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Financeiro() {
  const { usuario } = useAuth()
  const [lancamentos, setLancamentos] = useState([])

  // Formulário
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('saida')
  const [cat, setCat] = useState('Alimentação')
  const [dataVencimento, setDataVencimento] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [mesFiltro, setMesFiltro] = useState(mesAtual())

  const colecao = collection(db, 'usuarios', usuario.uid, 'financeiro')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap =>
      setLancamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  useEffect(() => {
    setCat(categorias[tipo][0])
  }, [tipo])

  async function adicionar() {
    const v = parseFloat(valor.replace(',', '.'))
    if (!desc.trim() || isNaN(v) || v <= 0) return
    setSalvando(true)

    const hoje = hojeISO()
    const mesDoc = dataVencimento ? dataVencimento.substring(0, 7) : mesAtual()
    const isPago = !dataVencimento || dataVencimento <= hoje

    const docData = {
      desc, valor: v, tipo, cat,
      mes: mesDoc,
      dataVencimento: dataVencimento || null,
      pago: isPago,
      recorrente,
      criadoEm: Date.now()
    }

    if (!recorrente) {
      await addDoc(colecao, docData)
    } else {
      // Cria 12 meses de lançamentos recorrentes
      const lote = writeBatch(db)
      const [baseY, baseM, baseD] = (dataVencimento || `${mesAtual()}-01`).split('-').map(Number)
      for (let i = 0; i < 12; i++) {
        const totalM = (baseM - 1) + i
        const y = baseY + Math.floor(totalM / 12)
        const m = (totalM % 12) + 1
        const mesI = `${y}-${String(m).padStart(2, '0')}`
        const diaI = String(baseD || 1).padStart(2, '0')
        const dataI = `${mesI}-${diaI}`
        lote.set(doc(collection(db, 'usuarios', usuario.uid, 'financeiro')), {
          ...docData,
          mes: mesI,
          dataVencimento: dataI,
          pago: dataI <= hoje,
          criadoEm: Date.now() + i
        })
      }
      await lote.commit()
    }

    setDesc(''); setValor(''); setDataVencimento(''); setRecorrente(false)
    setSalvando(false)
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'financeiro', id))
  }

  async function togglePago(id, pago) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'financeiro', id), { pago: !pago })
  }

  const doMes = useMemo(
    () => lancamentos.filter(l => l.mes === mesFiltro),
    [lancamentos, mesFiltro]
  )

  const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas   = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo    = entradas - saidas

  const hoje = hojeISO()

  function statusLabel(l) {
    if (l.pago) return { label: 'Pago', cls: 'bg-emerald-50 text-emerald-600' }
    if (l.dataVencimento && l.dataVencimento < hoje) return { label: 'Vencida', cls: 'bg-red-50 text-red-500' }
    if (l.dataVencimento) return { label: 'Pendente', cls: 'bg-amber-50 text-amber-500' }
    return null
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-bold text-slate-800 mb-1">Financeiro</h1>
        <p className="text-sm text-slate-400 mb-6">Controle seus gastos e ganhos</p>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-4 text-center">
            <p className="text-xs font-medium text-slate-400 mb-1.5">Entradas</p>
            <p className="text-base font-bold text-emerald-600">{fmt(entradas)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-medium text-slate-400 mb-1.5">Saídas</p>
            <p className="text-base font-bold text-rose-500">{fmt(saidas)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-medium text-slate-400 mb-1.5">Saldo</p>
            <p className={`text-base font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
              {fmt(saldo)}
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="card p-4 mb-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">Novo lançamento</p>

          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 transition placeholder:text-slate-300"
              placeholder="Descrição"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            <input
              className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 transition placeholder:text-slate-300"
              placeholder="Valor"
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
            />
          </div>

          <div className="flex gap-2 mb-2">
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none flex-1 text-slate-700"
              value={tipo}
              onChange={e => setTipo(e.target.value)}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none flex-1 text-slate-700"
              value={cat}
              onChange={e => setCat(e.target.value)}
            >
              {categorias[tipo].map(c => <option key={c}>{c}</option>)}
            </select>
            <button
              onClick={adicionar}
              disabled={salvando}
              className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-blue-100 transition disabled:opacity-50"
            >
              {salvando ? '...' : '+ Add'}
            </button>
          </div>

          {/* Data de vencimento + recorrente */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-50 mt-1">
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Vencimento (opcional — para contas futuras)</p>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none text-slate-600"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-4">
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-500"
                checked={recorrente}
                onChange={e => setRecorrente(e.target.checked)}
              />
              <div>
                <p className="text-xs font-medium text-slate-600">Mensal</p>
                <p className="text-xs text-slate-400">12 meses</p>
              </div>
            </label>
          </div>
        </div>

        {/* Filtro de mês */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Lançamentos</p>
          <input
            type="month"
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm outline-none text-slate-600"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
          />
        </div>

        {/* Lista */}
        {doMes.length === 0 ? (
          <div className="text-center py-16 text-slate-300 text-sm">
            Nenhum lançamento neste mês
          </div>
        ) : (
          <div className="card overflow-hidden">
            {doMes.map((l, i) => {
              const st = statusLabel(l)
              return (
                <div
                  key={l.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < doMes.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    l.tipo === 'entrada' ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}>
                    <span className={`text-xs font-bold ${l.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {l.tipo === 'entrada' ? '↑' : '↓'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{l.desc}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400">{l.cat}</p>
                      {l.dataVencimento && (
                        <p className="text-xs text-slate-300">· vence {l.dataVencimento.split('-').reverse().slice(0,2).join('/')}</p>
                      )}
                      {l.recorrente && (
                        <span className="text-xs text-blue-400">↻ mensal</span>
                      )}
                    </div>
                  </div>

                  <span className={`text-sm font-semibold ${l.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {l.tipo === 'entrada' ? '+' : '−'} {fmt(l.valor)}
                  </span>

                  {/* Badge pago/pendente (clicável para alternar) */}
                  {st && (
                    <button
                      onClick={() => togglePago(l.id, l.pago)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition hover:opacity-70 ${st.cls}`}
                      title="Clique para alternar status"
                    >
                      {st.label}
                    </button>
                  )}

                  <button
                    onClick={() => deletar(l.id)}
                    className="text-slate-200 hover:text-rose-400 text-xs transition ml-1"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </Layout>
  )
}
