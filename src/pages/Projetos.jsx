import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  deleteDoc, updateDoc, doc, query, orderBy
} from 'firebase/firestore'
import {
  FolderKanban, Plus, GitBranch, Globe, Trash2,
  Search, ChevronDown, ChevronUp, Tag, X,
} from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_LIST = ['Ideia', 'Planejando', 'Em andamento', 'Pausado', 'Concluído', 'Documentação']

const TIPOS_PADRAO = ['App', 'Site', 'API', 'Mobile', 'Script', 'Estudo', 'Freela', 'Ideia', 'Outro']

const COR_STATUS = {
  'Ideia':        { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400'   },
  'Planejando':   { bg: 'bg-blue-50',    text: 'text-blue-600',   dot: 'bg-blue-400'    },
  'Em andamento': { bg: 'bg-amber-50',   text: 'text-amber-600',  dot: 'bg-amber-400'   },
  'Pausado':      { bg: 'bg-orange-50',  text: 'text-orange-600', dot: 'bg-orange-400'  },
  'Concluído':    { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-400' },
  'Documentação': { bg: 'bg-purple-50',  text: 'text-purple-600', dot: 'bg-purple-400'  },
}

const PROG_COR = (pct) => {
  if (pct >= 100) return '#10b981'
  if (pct >= 60)  return '#3b82f6'
  if (pct >= 30)  return '#f59e0b'
  return '#94a3b8'
}

// ── Badge de status ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const c = COR_STATUS[status] || COR_STATUS['Ideia']
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {status}
    </span>
  )
}

// ── Tag de tecnologia ─────────────────────────────────────────────────────────

function TechTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-rose-500 transition">
          <X size={9} />
        </button>
      )}
    </span>
  )
}

// ── Formulário de novo projeto ────────────────────────────────────────────────

function FormularioProjeto({ onSalvar, onCancelar }) {
  const [nome, setNome]         = useState('')
  const [tipo, setTipo]         = useState('App')
  const [status, setStatus]     = useState('Ideia')
  const [progresso, setProgresso] = useState(0)
  const [descricao, setDescricao] = useState('')
  const [github, setGithub]     = useState('')
  const [demo, setDemo]         = useState('')
  const [obs, setObs]           = useState('')
  const [techInput, setTechInput] = useState('')
  const [techs, setTechs]       = useState([])
  const [salvando, setSalvando] = useState(false)

  function addTech(e) {
    if (e.key !== 'Enter' && e.key !== ',') return
    e.preventDefault()
    const t = techInput.trim().replace(',', '')
    if (t && !techs.includes(t)) setTechs(prev => [...prev, t])
    setTechInput('')
  }

  function removeTech(t) {
    setTechs(prev => prev.filter(x => x !== t))
  }

  async function salvar() {
    if (!nome.trim()) return
    setSalvando(true)
    await onSalvar({
      nome, tipo, status,
      progresso: Number(progresso),
      descricao: descricao || '',
      github: github || null,
      demo: demo || null,
      obs: obs || '',
      tecnologias: techs,
      criadoEm: Date.now(),
    })
    setSalvando(false)
  }

  return (
    <div className="card p-5 mb-4 border border-blue-100 animate-fade-in">
      <p className="text-sm font-semibold text-slate-700 mb-4">Novo projeto</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Nome *</label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition"
            placeholder="Ex: App de finanças..."
            value={nome}
            onChange={e => setNome(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Tipo</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            {TIPOS_PADRAO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
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
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
            <span>Progresso</span>
            <span className="font-bold text-blue-600">{progresso}%</span>
          </label>
          <input
            type="range"
            min="0" max="100" step="5"
            className="w-full h-2 rounded-full accent-blue-500 cursor-pointer"
            value={progresso}
            onChange={e => setProgresso(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Descrição</label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition resize-none"
          rows={2}
          placeholder="O que é esse projeto?"
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            < GitBranch size={10} /> GitHub
          </label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition"
            placeholder="https://github.com/..."
            value={github}
            onChange={e => setGithub(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Globe size={10} /> Demo / Link
          </label>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition"
            placeholder="https://..."
            value={demo}
            onChange={e => setDemo(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
          <Tag size={10} /> Tecnologias (Enter ou vírgula para adicionar)
        </label>
        <div className="border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-300 transition">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {techs.map(t => (
              <TechTag key={t} label={t} onRemove={() => removeTech(t)} />
            ))}
          </div>
          <input
            className="w-full text-sm outline-none placeholder:text-slate-300"
            placeholder="React, Node, Tailwind..."
            value={techInput}
            onChange={e => setTechInput(e.target.value)}
            onKeyDown={addTech}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium text-slate-500 mb-1 block">Observações</label>
        <textarea
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition resize-none"
          rows={2}
          placeholder="Notas, próximos passos, links..."
          value={obs}
          onChange={e => setObs(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={salvar}
          disabled={salvando || !nome.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 shadow-sm"
        >
          {salvando ? 'Salvando...' : 'Criar projeto'}
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

// ── Card de projeto expandível ────────────────────────────────────────────────

function CardProjeto({ projeto, onDeletar, onUpdate }) {
  const [expandido, setExpandido] = useState(false)
  const [editandoProg, setEditandoProg] = useState(false)
  const [novoStatus, setNovoStatus]     = useState(projeto.status)
  const pct = projeto.progresso || 0

  async function mudarStatus(s) {
    setNovoStatus(s)
    await onUpdate(projeto.id, { status: s })
  }

  async function atualizarProgresso(v) {
    await onUpdate(projeto.id, { progresso: Number(v) })
    setEditandoProg(false)
  }

  return (
    <div className={`card overflow-hidden transition-all duration-200 ${expandido ? 'ring-1 ring-blue-100' : ''}`}>
      {/* Linha principal */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50/50 transition"
        onClick={() => setExpandido(e => !e)}
      >
        {/* Indicador de progresso lateral */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0 overflow-hidden bg-slate-100">
          <div
            className="w-full rounded-full transition-all duration-500"
            style={{ height: `${pct}%`, background: PROG_COR(pct) }}
          />
        </div>

        {/* Nome + tipo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">{projeto.nome}</p>
            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {projeto.tipo}
            </span>
          </div>
          {projeto.descricao && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{projeto.descricao}</p>
          )}
          {projeto.tecnologias?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {projeto.tecnologias.slice(0, 4).map(t => (
                <TechTag key={t} label={t} />
              ))}
              {projeto.tecnologias.length > 4 && (
                <span className="text-[10px] text-slate-400">+{projeto.tecnologias.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Status + progresso */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold" style={{ color: PROG_COR(pct) }}>{pct}%</p>
            <p className="text-[9px] text-slate-400">progresso</p>
          </div>
          <StatusBadge status={projeto.status} />
          {expandido
            ? <ChevronUp size={14} className="text-slate-400" />
            : <ChevronDown size={14} className="text-slate-400" />
          }
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-0.5 bg-slate-50">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, background: PROG_COR(pct) }}
        />
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-4 py-4 border-t border-slate-50 bg-slate-50/30 animate-fade-in">
          <div className="grid grid-cols-2 gap-4 mb-4">

            {/* Status selector */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_LIST.map(s => {
                  const c = COR_STATUS[s]
                  return (
                    <button
                      key={s}
                      onClick={() => mudarStatus(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                        novoStatus === s
                          ? `${c.bg} ${c.text} border-transparent`
                          : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Progresso slider */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
                <span>Progresso</span>
                <span className="font-bold" style={{ color: PROG_COR(pct) }}>{pct}%</span>
              </p>
              <input
                type="range"
                min="0" max="100" step="5"
                className="w-full h-2 rounded-full cursor-pointer accent-blue-500"
                defaultValue={pct}
                onChange={e => onUpdate(projeto.id, { progresso: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Descrição + obs */}
          {(projeto.descricao || projeto.obs) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {projeto.descricao && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Descrição</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{projeto.descricao}</p>
                </div>
              )}
              {projeto.obs && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Observações</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{projeto.obs}</p>
                </div>
              )}
            </div>
          )}

          {/* Links + ações */}
          <div className="flex items-center gap-3 flex-wrap">
            {projeto.github && (
              <a
                href={projeto.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 transition"
              >
                <GitBranch size={12} /> GitHub
              </a>
            )}
            {projeto.demo && (
              <a
                href={projeto.demo}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 transition"
              >
                <Globe size={12} /> Demo
              </a>
            )}
            <div className="ml-auto">
              <button
                onClick={() => onDeletar(projeto.id)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition px-2 py-1.5"
              >
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Projetos() {
  const { usuario } = useAuth()
  const [projetos, setProjetos]     = useState([])
  const [formulario, setFormulario] = useState(false)
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  const colecao = collection(db, 'usuarios', usuario.uid, 'projetos')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap =>
      setProjetos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  async function adicionar(dados) {
    await addDoc(colecao, dados)
    setFormulario(false)
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'projetos', id))
  }

  async function atualizar(id, campos) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'projetos', id), campos)
  }

  // Métricas
  const emAndamento = projetos.filter(p => p.status === 'Em andamento').length
  const concluidos  = projetos.filter(p => p.status === 'Concluído').length
  const progMedio   = projetos.length
    ? Math.round(projetos.reduce((s, p) => s + (p.progresso || 0), 0) / projetos.length)
    : 0

  // Filtros
  const projetosFiltrados = useMemo(() => projetos.filter(p => {
    const matchBusca  = !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.descricao?.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'Todos' || p.status === filtroStatus
    return matchBusca && matchStatus
  }), [projetos, busca, filtroStatus])

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 page-enter">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Projetos</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {projetos.length} projeto{projetos.length !== 1 ? 's' : ''} · {concluidos} concluído{concluidos !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setFormulario(f => !f)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm shadow-blue-200 active:scale-95"
          >
            <Plus size={15} />
            Novo projeto
          </button>
        </div>

        {/* Formulário */}
        {formulario && (
          <FormularioProjeto
            onSalvar={adicionar}
            onCancelar={() => setFormulario(false)}
          />
        )}

        {/* Métricas */}
        {projetos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{emAndamento}</p>
              <p className="text-xs text-slate-400 mt-0.5">em andamento</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{concluidos}</p>
              <p className="text-xs text-slate-400 mt-0.5">concluídos</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{progMedio}%</p>
              <p className="text-xs text-slate-400 mt-0.5">progresso médio</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-300 transition"
              placeholder="Buscar projeto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['Todos', ...STATUS_LIST].map(s => {
              const c = COR_STATUS[s]
              return (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition ${
                    filtroStatus === s
                      ? c ? `${c.bg} ${c.text} border-transparent` : 'bg-slate-800 text-white border-transparent'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de projetos */}
        {projetosFiltrados.length === 0 ? (
          <div className="card p-16 text-center">
            <FolderKanban size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-300">
              {projetos.length === 0
                ? 'Nenhum projeto ainda. Clique em "Novo projeto" para começar.'
                : 'Nenhum projeto corresponde aos filtros.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projetosFiltrados.map(p => (
              <CardProjeto
                key={p.id}
                projeto={p}
                onDeletar={deletar}
                onUpdate={atualizar}
              />
            ))}
          </div>
        )}

      </div>
    </Layout>
  )
}
