import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useModulos } from '../context/ModulosContext'
import { db } from '../firebase'
import {
  collection, onSnapshot, query, orderBy,
  doc, getDoc, updateDoc
} from 'firebase/firestore'
import {
  CalendarCheck, Wallet, BookOpen, Target, Trophy,
  ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Clock, ArrowUp, ArrowDown, X, AlertCircle
} from 'lucide-react'

// ── Utilitários ───────────────────────────────────────────────────────────────

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMes(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n) {
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtCurto(n) {
  const v = Math.abs(n || 0)
  if (v >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Math.round(n).toString()
}

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function diasAte(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000)
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_AB = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ── Calendário Mensal ─────────────────────────────────────────────────────────

function Calendario({ ano, mes, indicadores, diaSel, onSelect, hoje }) {
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate()

  // Grid com padding inicial
  const cells = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 mb-2">
        {DIAS_AB.map(d => (
          <p key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
            {d}
          </p>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((dia, i) => {
          if (!dia) return <div key={`_${i}`} />

          const ds     = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
          const ehHoje = ds === hoje
          const sel    = ds === diaSel
          const ind    = indicadores[ds] || {}
          const temEvt = ind.rotina || ind.financeiro || ind.estudo

          return (
            <button
              key={dia}
              onClick={() => onSelect(sel ? null : ds)}
              className={`cal-day relative flex flex-col items-center justify-center h-9 rounded-xl text-xs font-medium select-none active:scale-95 ${
                sel
                  ? 'cal-day-selected bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : ehHoje
                  ? 'cal-day-today ring-2 ring-blue-400 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="leading-none">{dia}</span>

              {/* Dots de eventos */}
              {temEvt && (
                <div className="absolute bottom-0.5 flex gap-0.5 items-center">
                  {ind.rotina && (
                    <span className={`w-[5px] h-[5px] rounded-full ${
                      sel ? 'bg-blue-200' : 'bg-blue-400'
                    }`} />
                  )}
                  {ind.financeiro && (
                    <span className={`w-[5px] h-[5px] rounded-full ${
                      sel ? 'bg-white/60' : ind.contaPendente ? 'bg-rose-400' : 'bg-emerald-400'
                    }`} />
                  )}
                  {ind.estudo && (
                    <span className={`w-[5px] h-[5px] rounded-full ${
                      sel ? 'bg-purple-200' : 'bg-purple-400'
                    }`} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Painel do dia selecionado ─────────────────────────────────────────────────

function PainelDia({ ds, rotina, financeiro, estudos, onFechar, onToggle }) {
  const [, m, d] = ds.split('-')
  const label = `${parseInt(d)} de ${MESES[parseInt(m) - 1]}`

  const tarefas = rotina.filter(t => t.data === ds)
  const contas  = financeiro.filter(f => f.dataVencimento === ds)
  const estds   = estudos.filter(e => e.dataEstudo === ds)
  const total   = tarefas.length + contas.length + estds.length

  return (
    <div className="card p-4 mb-4 page-enter" style={{ borderLeft: '3px solid #3b82f6' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="text-xs text-slate-400">
            {total === 0
              ? 'Dia livre — sem eventos'
              : `${total} ${total === 1 ? 'item' : 'itens'} agendados`}
          </p>
        </div>
        <button
          onClick={onFechar}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {total === 0 && (
        <p className="text-sm text-slate-300 pb-1">Aproveite o dia livre! 🌿</p>
      )}

      {/* Tarefas do dia */}
      {tarefas.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <CalendarCheck size={10} /> Rotina
          </p>
          <div className="space-y-2">
            {tarefas.map(t => (
              <div key={t.id} className="flex items-center gap-2.5">
                <button onClick={() => onToggle(t.id, t.feito)} className="flex-shrink-0 transition">
                  {t.feito
                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : <Circle size={16} className="text-slate-300 hover:text-slate-400" />
                  }
                </button>
                <span className={`text-sm flex-1 min-w-0 truncate ${
                  t.feito ? 'line-through text-slate-400' : 'text-slate-700'
                }`}>{t.texto}</span>
                {t.horario && (
                  <span className="text-xs font-mono text-slate-400 flex-shrink-0">{t.horario}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contas do dia */}
      {contas.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Wallet size={10} /> Contas
          </p>
          <div className="space-y-2">
            {contas.map(c => (
              <div key={c.id} className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.pago ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="text-sm flex-1 min-w-0 truncate text-slate-700">{c.desc}</span>
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  c.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-500'
                }`}>{fmt(c.valor)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${
                  c.pago ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                }`}>
                  {c.pago ? 'Pago' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estudos do dia */}
      {estds.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <BookOpen size={10} /> Estudos
          </p>
          <div className="space-y-2">
            {estds.map(e => (
              <div key={e.id} className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  e.prioridade === 'Alta' ? 'bg-rose-400' :
                  e.prioridade === 'Média' ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
                <span className={`text-sm flex-1 min-w-0 truncate ${
                  e.feito ? 'line-through text-slate-400' : 'text-slate-700'
                }`}>{e.titulo}</span>
                {e.tipo && <span className="text-xs text-purple-500 flex-shrink-0">{e.tipo}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const { usuario } = useAuth()
  const { moduloAtivo } = useModulos()

  // ── Estado ────────────────────────────────────────────────────────────────
  const [rotina,     setRotina]     = useState([])
  const [financeiro, setFinanceiro] = useState([])
  const [estudos,    setEstudos]    = useState([])
  const [metas,      setMetas]      = useState([])
  const [concurso,   setConcurso]   = useState(null)

  // Calendário
  const hoje    = toISO(new Date())
  const [viewAno, setViewAno] = useState(new Date().getFullYear())
  const [viewMes, setViewMes] = useState(new Date().getMonth())
  const [diaSel,  setDiaSel]  = useState(null)

  const primeiroNome = usuario?.displayName?.split(' ')[0] || 'você'

  // ── Firebase ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const uid = usuario.uid
    const unsubs = [
      onSnapshot(
        query(collection(db, 'usuarios', uid, 'rotina'), orderBy('criadoEm')),
        snap => setRotina(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, 'usuarios', uid, 'financeiro'), orderBy('criadoEm')),
        snap => setFinanceiro(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, 'usuarios', uid, 'estudos'), orderBy('criadoEm')),
        snap => setEstudos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, 'usuarios', uid, 'metas'), orderBy('criadoEm')),
        snap => setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
    ]
    getDoc(doc(db, 'usuarios', uid, 'concurso', 'dados'))
      .then(snap => { if (snap.exists()) setConcurso(snap.data()) })
      .catch(() => { /* concurso não configurado — ignora silenciosamente */ })
    return () => unsubs.forEach(u => u())
  }, [])

  async function onToggleRotina(id, feito) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'rotina', id), { feito: !feito })
  }

  // ── Indicadores do calendário ─────────────────────────────────────────────

  const indicadores = useMemo(() => {
    const map = {}

    rotina.forEach(t => {
      if (!t.data) return
      if (!map[t.data]) map[t.data] = {}
      map[t.data].rotina = true
    })

    financeiro.forEach(f => {
      if (!f.dataVencimento) return
      if (!map[f.dataVencimento]) map[f.dataVencimento] = {}
      map[f.dataVencimento].financeiro = true
      if (!f.pago) map[f.dataVencimento].contaPendente = true
    })

    estudos.forEach(e => {
      if (!e.dataEstudo) return
      if (!map[e.dataEstudo]) map[e.dataEstudo] = {}
      map[e.dataEstudo].estudo = true
    })

    return map
  }, [rotina, financeiro, estudos])

  // ── Navegação do calendário ───────────────────────────────────────────────

  function prevMes() {
    if (viewMes === 0) { setViewMes(11); setViewAno(y => y - 1) }
    else setViewMes(m => m - 1)
    setDiaSel(null)
  }

  function nextMes() {
    if (viewMes === 11) { setViewMes(0); setViewAno(y => y + 1) }
    else setViewMes(m => m + 1)
    setDiaSel(null)
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────

  // Rotina de hoje
  const rotinaHoje = rotina.filter(t => !t.data || t.data === hoje)
  const feitas     = rotinaHoje.filter(t => t.feito).length
  const totalHoje  = rotinaHoje.length
  const pctHoje    = totalHoje ? Math.round(feitas / totalHoje * 100) : 0

  // Financeiro do mês atual
  const mes      = getMes()
  const doMes    = financeiro.filter(f => f.mes === mes)
  const entradas = doMes.filter(f => f.tipo === 'entrada').reduce((s, f) => s + f.valor, 0)
  const saidas   = doMes.filter(f => f.tipo === 'saida').reduce((s, f) => s + f.valor, 0)
  const saldo    = entradas - saidas

  // Contas próximas (7 dias) + vencidas
  const em7d       = toISO(new Date(Date.now() + 7 * 86400000))
  const contasProx = financeiro
    .filter(f => f.dataVencimento && !f.pago && f.dataVencimento >= hoje && f.dataVencimento <= em7d)
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
  const contasVenc = financeiro
    .filter(f => f.dataVencimento && !f.pago && f.dataVencimento < hoje)
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))

  // Estudos
  const pendentes = estudos.filter(e => !e.feito)
  const altaPrio  = pendentes.filter(e => e.prioridade === 'Alta').length

  // Metas
  const metasAtivas = metas.filter(m => !m.feito)

  // Concurso
  const diasConcurso = diasAte(concurso?.dataProva)

  // Quantos dias do mês-view têm eventos
  const eventosMesView = Object.keys(indicadores).filter(k =>
    k.startsWith(`${viewAno}-${String(viewMes + 1).padStart(2, '0')}`)
  ).length

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 page-enter">

        {/* ── Saudação ───────────────────────────────────────────────────── */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-800 leading-tight">
            {saudacao()}, <span className="text-blue-600">{primeiroNome}</span> 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>

        {/* ── Quick stats strip — só módulos ativos ──────────────────────── */}
        <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {moduloAtivo('rotina') && (
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <CalendarCheck size={16} className="text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-blue-600 leading-none">{totalHoje}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">tarefas hoje</p>
              </div>
            </div>
          )}
          {moduloAtivo('financeiro') && (
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${saldo >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <Wallet size={16} className={saldo >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-bold leading-none ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {saldo >= 0 ? '+' : '−'}{fmtCurto(Math.abs(saldo))}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">saldo mês</p>
              </div>
            </div>
          )}
          {moduloAtivo('estudos') && (
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} className="text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-purple-600 leading-none">{pendentes.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">estudos</p>
              </div>
            </div>
          )}
          {moduloAtivo('metas') && (
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Target size={16} className="text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-amber-600 leading-none">{metasAtivas.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">metas</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Insights inteligentes ──────────────────────────────────────── */}
        {(() => {
          const cards = []

          // Rotina: tarefas com pouco progresso
          if (moduloAtivo('rotina') && totalHoje > 0 && pctHoje < 50) {
            cards.push({
              id:   'rotina-baixa',
              cor:  'bg-blue-500',
              icon: CalendarCheck,
              msg:  `Você completou ${feitas} de ${totalHoje} tarefas hoje (${pctHoje}%). Ainda dá tempo!`,
              tipo: 'info',
            })
          }

          // Financeiro: saldo negativo
          if (moduloAtivo('financeiro') && saldo < 0) {
            cards.push({
              id:   'saldo-neg',
              cor:  'bg-rose-500',
              icon: AlertCircle,
              msg:  `Saldo do mês está negativo (${fmt(saldo)}). Revise suas saídas.`,
              tipo: 'alerta',
            })
          }

          // Financeiro: contas vencidas
          if (moduloAtivo('financeiro') && contasVenc.length > 0) {
            cards.push({
              id:   'contas-venc',
              cor:  'bg-rose-500',
              icon: AlertCircle,
              msg:  `${contasVenc.length} ${contasVenc.length === 1 ? 'conta vencida' : 'contas vencidas'} sem pagamento. Regularize para evitar juros.`,
              tipo: 'alerta',
            })
          }

          // Financeiro: contas próximas
          if (moduloAtivo('financeiro') && contasProx.length > 0 && contasVenc.length === 0) {
            const proxima = contasProx[0]
            cards.push({
              id:   'contas-prox',
              cor:  'bg-amber-500',
              icon: Clock,
              msg:  `"${proxima.desc}" vence em breve (${fmt(proxima.valor)}). Fique de olho!`,
              tipo: 'aviso',
            })
          }

          // Estudos: alta prioridade pendente
          if (moduloAtivo('estudos') && altaPrio > 0) {
            cards.push({
              id:   'estudo-alta',
              cor:  'bg-purple-500',
              icon: BookOpen,
              msg:  `${altaPrio} ${altaPrio === 1 ? 'estudo de alta prioridade' : 'estudos de alta prioridade'} pendente${altaPrio > 1 ? 's' : ''}. Priorize hoje!`,
              tipo: 'aviso',
            })
          }

          // Concurso: próximo
          if (moduloAtivo('concurso') && diasConcurso !== null && diasConcurso > 0 && diasConcurso <= 30) {
            cards.push({
              id:   'concurso-prox',
              cor:  'bg-amber-500',
              icon: Trophy,
              msg:  `Sua prova está em ${diasConcurso} ${diasConcurso === 1 ? 'dia' : 'dias'}! Intensifique a preparação.`,
              tipo: 'aviso',
            })
          }

          if (cards.length === 0) return null

          return (
            <div className="mb-4 flex flex-col gap-2">
              {cards.map(card => {
                const Icon = card.icon
                return (
                  <div
                    key={card.id}
                    className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${
                      card.tipo === 'alerta'
                        ? 'bg-rose-50 border border-rose-100'
                        : card.tipo === 'aviso'
                        ? 'bg-amber-50 border border-amber-100'
                        : 'bg-blue-50 border border-blue-100'
                    }`}
                  >
                    <span className={`mt-0.5 flex-shrink-0 ${
                      card.tipo === 'alerta' ? 'text-rose-500' :
                      card.tipo === 'aviso'  ? 'text-amber-500' : 'text-blue-500'
                    }`}>
                      <Icon size={15} />
                    </span>
                    <p className={`text-sm leading-snug ${
                      card.tipo === 'alerta' ? 'text-rose-700' :
                      card.tipo === 'aviso'  ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                      {card.msg}
                    </p>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* ── Calendário ─────────────────────────────────────────────────── */}
        <div className="card p-5 mb-4">

          {/* Navegação do mês */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMes}
              className="w-8 h-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">
                {MESES[viewMes]} {viewAno}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {eventosMesView > 0
                  ? `${eventosMesView} dias com eventos`
                  : 'Nenhum evento'}
              </p>
            </div>
            <button
              onClick={nextMes}
              className="w-8 h-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[10px] text-slate-400">Rotina</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-[10px] text-slate-400">Conta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-[10px] text-slate-400">Estudo</span>
            </div>
          </div>

          <Calendario
            ano={viewAno}
            mes={viewMes}
            indicadores={indicadores}
            diaSel={diaSel}
            onSelect={setDiaSel}
            hoje={hoje}
          />
        </div>

        {/* ── Painel do dia ───────────────────────────────────────────────── */}
        {diaSel && (
          <PainelDia
            ds={diaSel}
            rotina={rotina}
            financeiro={financeiro}
            estudos={estudos}
            onFechar={() => setDiaSel(null)}
            onToggle={onToggleRotina}
          />
        )}

        {/* ── Rotina de hoje ──────────────────────────────────────────────── */}
        {moduloAtivo('rotina') && <div className="card p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <CalendarCheck size={17} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Rotina de hoje</p>
              <p className="text-xs text-slate-400">
                {totalHoje === 0
                  ? 'Nenhuma tarefa programada'
                  : `${feitas} de ${totalHoje} concluídas`}
              </p>
            </div>
            {totalHoje > 0 && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${
                pctHoje === 100
                  ? 'bg-emerald-50 text-emerald-600'
                  : pctHoje >= 50
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-slate-50 text-slate-500'
              }`}>
                {pctHoje}%
              </span>
            )}
          </div>

          {totalHoje === 0 ? (
            <p className="text-sm text-slate-300">Adicione tarefas na aba Rotina →</p>
          ) : (
            <>
              {/* Barra de progresso */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pctHoje}%`,
                    background: pctHoje === 100 ? '#10b981' : '#3b82f6'
                  }}
                />
              </div>

              {/* Lista de tarefas */}
              <div className="space-y-2.5">
                {rotinaHoje.slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <button onClick={() => onToggleRotina(t.id, t.feito)} className="flex-shrink-0 transition">
                      {t.feito
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <Circle size={16} className="text-slate-300 hover:text-slate-400" />
                      }
                    </button>
                    <span className={`text-sm flex-1 min-w-0 truncate ${
                      t.feito ? 'line-through text-slate-400' : 'text-slate-700'
                    }`}>
                      {t.texto}
                    </span>
                    {t.horario && (
                      <span className="text-xs font-mono text-slate-400 flex-shrink-0">{t.horario}</span>
                    )}
                  </div>
                ))}
                {rotinaHoje.length > 6 && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    +{rotinaHoje.length - 6} tarefa{rotinaHoje.length - 6 > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {pctHoje === 100 && (
                <p className="text-xs text-emerald-500 mt-3 font-semibold text-center">
                  🎉 Rotina concluída! Excelente trabalho.
                </p>
              )}
            </>
          )}
        </div>}

        {/* ── Grid: Financeiro + Contas próximas ─────────────────────────── */}
        {moduloAtivo('financeiro') && <div className="grid grid-cols-2 gap-4 mb-4">

          {/* Financeiro do mês */}
          <div className="card p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Wallet size={13} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Financeiro</p>
            </div>

            <p className={`text-xl font-bold mb-0.5 ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {fmt(saldo)}
            </p>
            <p className="text-[10px] text-slate-400 mb-3">saldo do mês</p>

            <div className="space-y-1.5 mt-auto">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 min-w-0">
                  <ArrowUp size={9} className="text-emerald-500 flex-shrink-0" />
                  <span className="truncate">Entradas</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 flex-shrink-0">{fmt(entradas)}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 min-w-0">
                  <ArrowDown size={9} className="text-rose-500 flex-shrink-0" />
                  <span className="truncate">Saídas</span>
                </span>
                <span className="text-[10px] font-semibold text-rose-500 flex-shrink-0">{fmt(saidas)}</span>
              </div>
            </div>

            {/* Barra despesas / receita */}
            {entradas > 0 && (
              <div className="mt-2.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(saidas / entradas * 100, 100)}%`,
                    background: saidas > entradas ? '#f43f5e' : '#34d399'
                  }}
                />
              </div>
            )}
          </div>

          {/* Contas próximas */}
          <div className="card p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                contasVenc.length > 0 ? 'bg-rose-50' : 'bg-amber-50'
              }`}>
                {contasVenc.length > 0
                  ? <AlertCircle size={13} className="text-rose-500" />
                  : <Clock size={13} className="text-amber-600" />
                }
              </div>
              <p className="text-xs font-semibold text-slate-700">Próx. Contas</p>
            </div>

            {contasVenc.length > 0 && (
              <div className="bg-rose-50 rounded-xl px-2.5 py-1.5 mb-2.5">
                <p className="text-[10px] font-bold text-rose-600">
                  {contasVenc.length} vencida{contasVenc.length > 1 ? 's' : ''}!
                </p>
              </div>
            )}

            {contasProx.length === 0 && contasVenc.length === 0 ? (
              <p className="text-xs text-slate-300 mt-auto">Nenhuma conta nos próximos 7 dias</p>
            ) : (
              <div className="space-y-2.5 mt-auto">
                {[...contasVenc.slice(0, 1), ...contasProx.slice(0, 2)].map(c => {
                  const drs = diasAte(c.dataVencimento)
                  return (
                    <div key={c.id}>
                      <p className="text-[11px] font-medium text-slate-700 truncate">{c.desc}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-[10px] font-medium ${
                          drs !== null && drs < 0 ? 'text-rose-500' :
                          drs === 0 ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {drs === null    ? '' :
                           drs < 0  ? `${Math.abs(drs)}d atrás` :
                           drs === 0 ? 'hoje' :
                           `em ${drs}d`}
                        </span>
                        <span className="text-[10px] font-semibold text-rose-500 flex-shrink-0">
                          {fmt(c.valor)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>}

        {/* ── Grid: Estudos + Metas ───────────────────────────────────────── */}
        {(moduloAtivo('estudos') || moduloAtivo('metas')) && (
        <div className={`grid gap-4 mb-4 ${moduloAtivo('estudos') && moduloAtivo('metas') ? 'grid-cols-2' : 'grid-cols-1'}`}>

          {/* Estudos pendentes */}
          {moduloAtivo('estudos') && <div className="card p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={13} className="text-purple-600" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Estudos</p>
            </div>

            <p className="text-xl font-bold text-slate-800 mb-0.5">{pendentes.length}</p>
            <p className="text-[10px] text-slate-400 mb-2.5">
              {pendentes.length === 1 ? 'pendente' : 'pendentes'}
            </p>

            {altaPrio > 0 && (
              <div className="bg-rose-50 rounded-lg px-2 py-1.5 mb-2">
                <p className="text-[10px] font-bold text-rose-500">
                  {altaPrio} alta prioridade
                </p>
              </div>
            )}

            <div className="space-y-1.5 mt-auto">
              {pendentes.slice(0, 3).map(e => (
                <div key={e.id} className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    e.prioridade === 'Alta'  ? 'bg-rose-400' :
                    e.prioridade === 'Média' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className="text-[11px] text-slate-600 truncate">{e.titulo}</span>
                </div>
              ))}
              {pendentes.length === 0 && (
                <p className="text-xs text-slate-300">Nenhum pendente</p>
              )}
            </div>
          </div>}

          {/* Metas ativas */}
          {moduloAtivo('metas') && <div className="card p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Target size={13} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Metas</p>
            </div>

            <p className="text-xl font-bold text-slate-800 mb-0.5">{metasAtivas.length}</p>
            <p className="text-[10px] text-slate-400 mb-2.5">
              {metasAtivas.length === 1 ? 'ativa' : 'ativas'}
            </p>

            <div className="space-y-2.5 mt-auto">
              {metasAtivas.slice(0, 3).map(m => {
                const pct = m.valorAlvo && m.totalDepositado != null
                  ? Math.min(Math.round(m.totalDepositado / m.valorAlvo * 100), 100)
                  : null
                return (
                  <div key={m.id} className="min-w-0">
                    <p className="text-[11px] text-slate-600 truncate mb-1">{m.titulo}</p>
                    {pct !== null && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 flex-shrink-0">{pct}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {metasAtivas.length === 0 && (
                <p className="text-xs text-slate-300">Nenhuma meta ativa</p>
              )}
            </div>
          </div>}
        </div>
        )}

        {/* ── Concurso ───────────────────────────────────────────────────── */}
        {moduloAtivo('concurso') && concurso?.dataProva && diasConcurso !== null && (
          <div className={`card p-5 mb-4 overflow-hidden relative ${
            diasConcurso <= 7  ? 'border border-rose-100' :
            diasConcurso <= 30 ? 'border border-amber-100' : ''
          }`}>
            {/* Accent strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              diasConcurso <= 7  ? 'bg-rose-400' :
              diasConcurso <= 30 ? 'bg-amber-400' : 'bg-blue-400'
            }`} />

            <div className="flex items-center justify-between pl-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  diasConcurso <= 7  ? 'bg-rose-50' :
                  diasConcurso <= 30 ? 'bg-amber-50' : 'bg-blue-50'
                }`}>
                  <Trophy size={16} className={
                    diasConcurso <= 7  ? 'text-rose-500' :
                    diasConcurso <= 30 ? 'text-amber-600' : 'text-blue-600'
                  } />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {concurso.nome || 'Concurso'}
                  </p>
                  {concurso.banca && (
                    <p className="text-xs text-slate-400">{concurso.banca}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className={`text-3xl font-bold leading-none ${
                  diasConcurso <= 7  ? 'text-rose-500' :
                  diasConcurso <= 30 ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  {diasConcurso}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">dias restantes</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
