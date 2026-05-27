import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  deleteDoc, updateDoc, doc, query, orderBy
} from 'firebase/firestore'
import {
  Briefcase, Plus, ExternalLink, Trash2,
  Building2, Search, Filter, ChevronDown,
} from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS = ['CLT', 'Estágio', 'Freelancer', 'Concurso', 'Entrevista', 'Prova']

const STATUS_LIST = [
  'Currículo enviado',
  'Em análise',
  'Entrevista',
  'Aguardando retorno',
  'Aprovado',
  'Recusado',
]

const COR_STATUS = {
  'Currículo enviado':  { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400'   },
  'Em análise':         { bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-400'  },
  'Entrevista':         { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400' },
  'Aguardando retorno': { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
  'Aprovado':           { bg: 'bg-emerald-50',text: 'text-emerald-600',dot: 'bg-emerald-400'},
  'Recusado':           { bg: 'bg-rose-50',   text: 'text-rose-500',   dot: 'bg-rose-400'   },
}

const STATUS_ORDEM = {
  'Currículo enviado': 0, 'Em análise': 1, 'Entrevista': 2,
  'Aguardando retorno': 3, 'Aprovado': 4, 'Recusado': 5,
}

// ── Badge de status ───────────────────────────────────────────────────────────

function StatusBadge({ status, onClick }) {
  const c = COR_STATUS[status] || COR_STATUS['Currículo enviado']
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition hover:opacity-80 ${c.bg} ${c.text}`}
      title="Clique para avançar status"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {status}
    </button>
  )
}

// ── Formulário inline ─────────────────────────────────────────────────────────

function FormularioVaga({ onSalvar, onCancelar }) {
  const [empresa, setEmpresa]   = useState('')
  const [cargo, setCargo]       = useState('')
  const [tipo, setTipo]         = useState('CLT')
  const [status, setStatus]     = useState('Currículo enviado')
  const [data, setData]         = useState('')
  const [link, setLink]         = useState('')
  const [obs, setObs]           = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!empresa.trim() || !cargo.trim()) return
    setSalvando(true)
    await onSalvar({ empresa, cargo, tipo, status, data: data || null, link: link || null, obs: obs || '', criadoEm: Date.now() })
    setSalvando(false)
  }

  return (
    <div className="card p-5 mb-4 border border-blue-100 animate-fade-in">
      <p className="text-sm font-semibold text-slate-700 mb-4">Nova candidatura</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Building2 size={11} /> Empresa *
          </label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition"
            placeholder="Ex: Google, Nubank..."
            value={empresa}
            onChange={e => setEmpresa(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Briefcase size={11} /> Cargo *
          </label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition"
            placeholder="Ex: Dev Front-end..."
            value={cargo}
            onChange={e => setCargo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && salvar()}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Tipo</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Data</label>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
            value={data}
            onChange={e => setData(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Link da vaga</label>
        <input
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition"
          placeholder="https://..."
          value={link}
          onChange={e => setLink(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Observações</label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition resize-none"
          rows={2}
          placeholder="Salário, benefícios, contato, notas..."
          value={obs}
          onChange={e => setObs(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={salvar}
          disabled={salvando || !empresa.trim() || !cargo.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 shadow-sm"
        >
          {salvando ? 'Salvando...' : 'Salvar candidatura'}
        </button>
        <button
          onClick={onCancelar}
          className="bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl px-4 py-2 text-sm transition border border-slate-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Vagas() {
  const { usuario } = useAuth()
  const [vagas, setVagas]           = useState([])
  const [formulario, setFormulario] = useState(false)
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [filtroTipo, setFiltroTipo]     = useState('Todos')

  const colecao = collection(db, 'usuarios', usuario.uid, 'vagas')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap =>
      setVagas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  async function adicionar(dados) {
    await addDoc(colecao, dados)
    setFormulario(false)
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'vagas', id))
  }

  async function avancarStatus(vaga) {
    const idx  = STATUS_ORDEM[vaga.status] ?? 0
    const next = STATUS_LIST[Math.min(idx + 1, STATUS_LIST.length - 1)]
    if (next === vaga.status) return
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'vagas', vaga.id), { status: next })
  }

  // Métricas rápidas
  const aprovadas   = vagas.filter(v => v.status === 'Aprovado').length
  const entrevistas = vagas.filter(v => v.status === 'Entrevista').length
  const enviadas    = vagas.filter(v => v.status === 'Currículo enviado').length

  // Filtros
  const vagasFiltradas = useMemo(() => vagas.filter(v => {
    const matchBusca  = !busca || v.empresa.toLowerCase().includes(busca.toLowerCase()) || v.cargo.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'Todos' || v.status === filtroStatus
    const matchTipo   = filtroTipo   === 'Todos' || v.tipo   === filtroTipo
    return matchBusca && matchStatus && matchTipo
  }), [vagas, busca, filtroStatus, filtroTipo])

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 page-enter">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Vagas & Candidaturas</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {vagas.length} candidaturas · {aprovadas} aprovada{aprovadas !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setFormulario(f => !f)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm shadow-blue-200 active:scale-95"
          >
            <Plus size={15} />
            Nova vaga
          </button>
        </div>

        {/* Formulário */}
        {formulario && (
          <FormularioVaga
            onSalvar={adicionar}
            onCancelar={() => setFormulario(false)}
          />
        )}

        {/* Métricas rápidas */}
        {vagas.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{enviadas}</p>
              <p className="text-xs text-slate-400 mt-0.5">enviadas</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{entrevistas}</p>
              <p className="text-xs text-slate-400 mt-0.5">entrevistas</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{aprovadas}</p>
              <p className="text-xs text-slate-400 mt-0.5">aprovadas</p>
            </div>
          </div>
        )}

        {/* Filtros + busca */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-300 transition"
              placeholder="Buscar empresa ou cargo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="border border-slate-200 rounded-xl pl-7 pr-7 py-2 text-sm outline-none appearance-none cursor-pointer"
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
            >
              <option value="Todos">Todos os status</option>
              {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              className="border border-slate-200 rounded-xl px-3 pr-7 py-2 text-sm outline-none appearance-none cursor-pointer"
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
            >
              <option value="Todos">Todos os tipos</option>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabela de candidaturas */}
        {vagasFiltradas.length === 0 ? (
          <div className="card p-16 text-center">
            <Briefcase size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-300">
              {vagas.length === 0
                ? 'Nenhuma candidatura ainda. Clique em "Nova vaga" para começar.'
                : 'Nenhuma candidatura corresponde aos filtros.'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[1fr_1fr_100px_140px_60px] gap-3 px-4 py-2.5 border-b border-slate-50 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa / Cargo</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"></p>
            </div>

            {/* Linhas */}
            {vagasFiltradas.map((v, i) => (
              <div
                key={v.id}
                className={`grid grid-cols-[1fr_1fr_100px_140px_60px] gap-3 items-center px-4 py-3 transition hover:bg-slate-50/50 ${
                  i < vagasFiltradas.length - 1 ? 'border-b border-slate-50' : ''
                }`}
              >
                {/* Empresa + Cargo */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{v.empresa}</p>
                  <p className="text-xs text-slate-400 truncate">{v.cargo}</p>
                  {v.obs && (
                    <p className="text-[10px] text-slate-300 truncate mt-0.5">{v.obs}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={v.status} onClick={() => avancarStatus(v)} />
                </div>

                {/* Tipo */}
                <p className="text-xs text-slate-500 font-medium">{v.tipo}</p>

                {/* Data */}
                <p className="text-xs text-slate-400">
                  {v.data
                    ? new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>

                {/* Ações */}
                <div className="flex items-center gap-1.5 justify-end">
                  {v.link && (
                    <a
                      href={v.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-600 transition"
                      title="Abrir vaga"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => deletar(v.id)}
                    className="text-slate-200 hover:text-rose-400 transition"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </Layout>
  )
}
