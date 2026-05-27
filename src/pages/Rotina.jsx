import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, doc, query, orderBy, writeBatch
} from 'firebase/firestore'
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from 'lucide-react'

const TURNOS = ['Manhã', 'Tarde', 'Noite']
const ICONES = { Manhã: '🌅', Tarde: '☀️', Noite: '🌙' }
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ── Utilidades de data ───────────────────────────────────────────────────────

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function hoje() { return toISO(new Date()) }

function fromISO(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDias(str, n) {
  const d = fromISO(str)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

function celulasMes(year, month) {
  const primeiro = new Date(year, month, 1)
  const total = new Date(year, month + 1, 0).getDate()
  const grade = Array(primeiro.getDay()).fill(null)
  for (let d = 1; d <= total; d++) grade.push(toISO(new Date(year, month, d)))
  return grade
}

function turnoDeHorario(horario) {
  if (!horario) return null
  const [h] = horario.split(':').map(Number)
  if (h < 12) return 'Manhã'
  if (h < 18) return 'Tarde'
  return 'Noite'
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function Rotina() {
  const { usuario } = useAuth()
  const [tarefas, setTarefas] = useState([])
  const [dataSel, setDataSel] = useState(hoje())
  const [mesVis, setMesVis] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() })
  const [calAberto, setCalAberto] = useState(false)

  // Formulário
  const [texto, setTexto] = useState('')
  const [horario, setHorario] = useState('')
  const [turno, setTurno] = useState('Manhã')
  const [recorrencia, setRecorrencia] = useState('unica')
  const [diasSelecionados, setDiasSelecionados] = useState([])
  const [salvando, setSalvando] = useState(false)

  const colecao = collection(db, 'usuarios', usuario.uid, 'rotina')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm'))
    return onSnapshot(q, snap =>
      setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // Turno automático quando horário muda
  useEffect(() => {
    const auto = turnoDeHorario(horario)
    if (auto) setTurno(auto)
  }, [horario])

  const datasComTarefa = useMemo(() => {
    const s = new Set()
    tarefas.forEach(t => { if (t.data) s.add(t.data) })
    return s
  }, [tarefas])

  const doDia = useMemo(
    () => tarefas.filter(t => t.data === dataSel),
    [tarefas, dataSel]
  )

  const total = doDia.length
  const feitas = doDia.filter(t => t.feito).length
  const pct = total ? Math.round(feitas / total * 100) : 0
  const ehHoje = dataSel === hoje()

  function toggleDia(idx) {
    setDiasSelecionados(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    )
  }

  async function adicionar() {
    if (!texto.trim()) return
    setSalvando(true)
    const uid = usuario.uid
    const turnoFinal = horario ? turnoDeHorario(horario) : turno

    if (recorrencia === 'unica') {
      await addDoc(colecao, {
        texto, turno: turnoFinal, horario: horario || null,
        feito: false, data: dataSel, criadoEm: Date.now()
      })
    } else {
      const lote = writeBatch(db)
      const base = fromISO(dataSel)
      for (let i = 0; i < 30; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() + i)
        const incluir = recorrencia === 'diaria'
          || (recorrencia === 'dias_semana' && diasSelecionados.includes(d.getDay()))
        if (incluir) {
          lote.set(doc(collection(db, 'usuarios', uid, 'rotina')), {
            texto, turno: turnoFinal, horario: horario || null,
            feito: false, data: toISO(d), recorrente: true, criadoEm: Date.now()
          })
        }
      }
      await lote.commit()
    }

    setTexto('')
    setHorario('')
    setRecorrencia('unica')
    setDiasSelecionados([])
    setSalvando(false)
  }

  async function toggleFeito(tarefa) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'rotina', tarefa.id), { feito: !tarefa.feito })
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'rotina', id))
  }

  function navegarData(n) {
    const nova = addDias(dataSel, n)
    setDataSel(nova)
    const d = fromISO(nova)
    setMesVis({ y: d.getFullYear(), m: d.getMonth() })
  }

  function irParaHoje() {
    const d = new Date()
    setDataSel(hoje())
    setMesVis({ y: d.getFullYear(), m: d.getMonth() })
  }

  function navegarMes(n) {
    setMesVis(v => {
      let m = v.m + n, y = v.y
      if (m < 0)  { m = 11; y-- }
      if (m > 11) { m = 0;  y++ }
      return { y, m }
    })
  }

  const labelData = fromISO(dataSel).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const turnoAutoLabel = horario ? turnoDeHorario(horario) : null

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 page-enter">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Rotina</h1>
          <button
            onClick={() => setCalAberto(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition ${
              calAberto ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <CalendarDays size={13} />
            Calendário
          </button>
        </div>

        {/* Navegação de dia */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navegarData(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-200 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-gray-700 capitalize">{labelData}</p>
            {!ehHoje && (
              <button onClick={irParaHoje} className="text-xs text-blue-500 hover:underline">
                Ir para hoje
              </button>
            )}
          </div>
          <button
            onClick={() => navegarData(1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-200 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendário expandível */}
        {calAberto && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navegarMes(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition">
                <ChevronLeft size={15} />
              </button>
              <p className="text-sm font-semibold text-gray-700">{MESES[mesVis.m]} {mesVis.y}</p>
              <button onClick={() => navegarMes(1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition">
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DIAS_SEMANA.map(d => (
                <p key={d} className="text-center text-xs text-gray-300 font-medium py-1">{d}</p>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {celulasMes(mesVis.y, mesVis.m).map((iso, i) => {
                if (!iso) return <div key={`_${i}`} />
                const sel = iso === dataSel
                const diaHoje = iso === hoje()
                const temTarefa = datasComTarefa.has(iso)
                return (
                  <button
                    key={iso}
                    onClick={() => { setDataSel(iso); setCalAberto(false) }}
                    className={`flex flex-col items-center justify-center h-9 rounded-xl text-xs font-medium transition ${
                      sel ? 'bg-blue-500 text-white shadow-sm'
                        : diaHoje ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {fromISO(iso).getDate()}
                    {temTarefa && (
                      <span className={`w-1 h-1 rounded-full mt-0.5 ${sel ? 'bg-blue-200' : 'bg-blue-400'}`} />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                tem tarefas
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="inline-block w-5 h-5 rounded-lg bg-blue-50 text-blue-600 text-center leading-5 text-xs font-medium">
                  {new Date().getDate()}
                </span>
                hoje
              </div>
            </div>
          </div>
        )}

        {/* Formulário */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">

          {/* Linha 1: texto + horário */}
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 transition"
              placeholder="Nova tarefa..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && recorrencia === 'unica' && adicionar()}
            />
            <input
              type="time"
              className="w-28 border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none focus:border-blue-300 transition"
              value={horario}
              onChange={e => setHorario(e.target.value)}
              title="Horário (define turno automaticamente)"
            />
          </div>

          {/* Linha 2: recorrência + turno + add */}
          <div className="flex gap-2 mb-2">
            <select
              className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none"
              value={recorrencia}
              onChange={e => { setRecorrencia(e.target.value); setDiasSelecionados([]) }}
            >
              <option value="unica">Não repete</option>
              <option value="diaria">Todos os dias (30d)</option>
              <option value="dias_semana">Dias específicos</option>
            </select>

            {/* Turno: auto-badge se horário preenchido, select se não */}
            {turnoAutoLabel ? (
              <div className="flex items-center px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-xs font-medium text-blue-600 whitespace-nowrap">
                  {ICONES[turnoAutoLabel]} {turnoAutoLabel}
                </span>
              </div>
            ) : (
              <select
                className="border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none"
                value={turno}
                onChange={e => setTurno(e.target.value)}
              >
                {TURNOS.map(t => <option key={t}>{t}</option>)}
              </select>
            )}

            <button
              onClick={adicionar}
              disabled={salvando || !texto.trim()}
              className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
            >
              {salvando ? '...' : '+ Add'}
            </button>
          </div>

          {/* Seletor de dias (aparece apenas para recorrência por dias) */}
          {recorrencia === 'dias_semana' && (
            <div className="flex gap-1.5 mt-1 mb-1 flex-wrap">
              {DIAS_SEMANA.map((dia, i) => (
                <button
                  key={i}
                  onClick={() => toggleDia(i)}
                  className={`w-9 h-9 text-xs rounded-full border font-medium transition ${
                    diasSelecionados.includes(i)
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : 'border-gray-200 text-gray-400 hover:border-blue-200 hover:text-blue-500'
                  }`}
                >
                  {dia}
                </button>
              ))}
            </div>
          )}

          {/* Barra de progresso do dia */}
          {total > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-400' : 'bg-blue-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 tabular-nums">{feitas}/{total}</span>
            </div>
          )}
        </div>

        {/* Lista por turno */}
        {TURNOS.map(t => {
          const lista = doDia.filter(x => x.turno === t)
          if (!lista.length) return null
          return (
            <div key={t} className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                <span className="text-base leading-none">{ICONES[t]}</span>
                {t}
              </p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {lista.map((tarefa, i) => (
                  <div
                    key={tarefa.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      i < lista.length - 1 ? 'border-b border-gray-50' : ''
                    } ${tarefa.feito ? 'bg-gray-50/50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={tarefa.feito}
                      onChange={() => toggleFeito(tarefa)}
                      className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0"
                    />
                    <span className={`flex-1 text-sm transition-all ${tarefa.feito ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                      {tarefa.texto}
                    </span>
                    {/* Horário e recorrência */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {tarefa.horario && (
                        <span className="text-xs text-gray-400 font-mono tabular-nums">{tarefa.horario}</span>
                      )}
                      {tarefa.recorrente && (
                        <RefreshCw size={10} className="text-blue-400" title="Recorrente" />
                      )}
                    </div>
                    <button
                      onClick={() => deletar(tarefa.id)}
                      className="text-gray-200 hover:text-red-400 text-xs transition ml-1 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {doDia.length === 0 && (
          <div className="text-center py-16 text-gray-300 text-sm">
            {ehHoje ? 'Nenhuma tarefa hoje — comece agora!' : 'Nenhuma tarefa registrada neste dia.'}
          </div>
        )}

      </div>
    </Layout>
  )
}
