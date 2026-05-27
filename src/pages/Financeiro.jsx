import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import AnaliseFinanceira from '../components/AnaliseFinanceira'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  deleteDoc, doc, query, orderBy
} from 'firebase/firestore'

const categorias = {
  entrada: ['Salário', 'Freelance', 'Presente', 'Outro'],
  saida: ['Alimentação', 'Transporte', 'Estudo', 'Saúde', 'Lazer', 'Contas', 'Outro']
}

function fmt(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Financeiro() {
  const { usuario } = useAuth()
  const [lancamentos, setLancamentos] = useState([])
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('saida')
  const [cat, setCat] = useState('Alimentação')
  const [salvando, setSalvando] = useState(false)
  const [mesFiltro, setMesFiltro] = useState(mesAtual())

  const colecao = collection(db, 'usuarios', usuario.uid, 'financeiro')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setLancamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    setCat(categorias[tipo][0])
  }, [tipo])

  async function adicionar() {
    const v = parseFloat(valor.replace(',', '.'))
    if (!desc.trim() || isNaN(v) || v <= 0) return
    setSalvando(true)
    await addDoc(colecao, {
      desc, valor: v, tipo, cat,
      mes: mesAtual(),
      criadoEm: Date.now()
    })
    setDesc('')
    setValor('')
    setSalvando(false)
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'financeiro', id))
  }

  const doMes = lancamentos.filter(l => l.mes === mesFiltro)
  const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo = entradas - saidas

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-medium text-gray-800 mb-1">Financeiro</h1>
        <p className="text-sm text-gray-400 mb-6">Controle seus gastos e ganhos</p>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Entradas</p>
            <p className="text-base font-medium text-green-600">{fmt(entradas)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Saídas</p>
            <p className="text-base font-medium text-red-400">{fmt(saidas)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Saldo</p>
            <p className={`text-base font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {fmt(saldo)}
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Novo lançamento</p>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Descrição"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            <input
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Valor"
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={tipo}
              onChange={e => setTipo(e.target.value)}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
            <select
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={cat}
              onChange={e => setCat(e.target.value)}
            >
              {categorias[tipo].map(c => <option key={c}>{c}</option>)}
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

        {/* Filtro de mês */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Lançamentos</p>
          <input
            type="month"
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
          />
        </div>

        {/* Lista */}
        {doMes.length === 0 ? (
          <div className="text-center py-10 text-gray-300 text-sm mb-6">
            Nenhum lançamento neste mês
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
            {doMes.map((l, i) => (
              <div
                key={l.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < doMes.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.tipo === 'entrada' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{l.desc}</p>
                  <p className="text-xs text-gray-400">{l.cat}</p>
                </div>
                <span className={`text-sm font-medium ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-400'}`}>
                  {l.tipo === 'entrada' ? '+' : '-'} {fmt(l.valor)}
                </span>
                <button
                  onClick={() => deletar(l.id)}
                  className="text-gray-200 hover:text-red-400 text-xs transition ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Análise financeira com IA */}
        <p className="text-sm font-medium text-gray-700 mb-3">Análise inteligente</p>
        <AnaliseFinanceira lancamentos={lancamentos} />

      </div>
    </div>
  )
}