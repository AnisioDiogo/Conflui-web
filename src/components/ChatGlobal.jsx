import { useState, useRef, useEffect } from 'react'
import {
  MessageCircle, X, Send, Mic, Square,
  Loader, Check, Zap, RefreshCw, ChevronDown
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { collection, addDoc, doc, writeBatch } from 'firebase/firestore'

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY

// ── Utilitários de data ──────────────────────────────────────────────────────

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function hojeISO() { return toISO(new Date()) }

function turnoDeHorario(horario) {
  if (!horario) return 'Manhã'
  const [h] = horario.split(':').map(Number)
  if (h < 12) return 'Manhã'
  if (h < 18) return 'Tarde'
  return 'Noite'
}

function contextoData() {
  const d = new Date()
  const dias  = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado']
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const amanha = new Date(d); amanha.setDate(amanha.getDate() + 1)
  return `Hoje: ${toISO(d)} (${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}). Amanhã: ${toISO(amanha)}.`
}

// ── Prompt do sistema ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente pessoal integrado a um app de organização de vida. Responda SEMPRE em JSON válido.

IDENTIFIQUE O MODO:
- AUTOMACAO: usuário quer CRIAR, ADICIONAR, REGISTRAR, AGENDAR, LANÇAR ou MARCAR algo no sistema
- CONVERSA: usuário faz perguntas, reflexões ou quer apenas conversar

FORMATO OBRIGATÓRIO (sempre este JSON, sem texto fora dele):
{
  "modo": "automacao" | "conversa",
  "resposta": "mensagem amigável em português",
  "tipo": "rotina" | "financeiro" | "estudo" | "meta" | null,
  "itens": []
}

REGRAS:
- modo conversa → tipo: null, itens: []
- modo automacao → itens com pelo menos 1 objeto
- Calcule datas relativas ("amanhã", "semana que vem", "mês que vem") usando a data fornecida
- diasSemana usa índices: 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb

SCHEMA DOS ITENS POR TIPO:

rotina:
{ "texto": "Nome da tarefa", "horario": "HH:MM", "data": "YYYY-MM-DD", "recorrencia": "unica|diaria|dias_semana|fins_de_semana", "diasSemana": [] }
Exemplos: "academia segunda a sexta às 18h" → recorrencia:"dias_semana", diasSemana:[1,2,3,4,5], horario:"18:00"
         "correr todo dia às 7h" → recorrencia:"diaria", horario:"07:00"
         "reunião amanhã às 9h" → recorrencia:"unica", data:amanha, horario:"09:00"

financeiro:
{ "desc": "Descrição", "valor": 0.00, "tipo": "entrada|saida", "cat": "Alimentação|Transporte|Estudo|Saúde|Lazer|Contas|Cartão|Salário|Freelance|Outro", "dataVencimento": "YYYY-MM-DD", "recorrente": false }
Exemplos: "paguei 50 no mercado" → tipo:"saida", cat:"Alimentação", valor:50
         "cartão Nubank vence dia 10" → cat:"Cartão", dataVencimento com dia 10 do próximo mês

estudo:
{ "titulo": "Assunto", "tipo": "Artigo|Vídeo|Livro|Revisão|Exercício", "prioridade": "Alta|Média|Baixa", "dataEstudo": "YYYY-MM-DD" }

meta:
{ "titulo": "Objetivo", "area": "Financeiro|Estudo|Saúde|Carreira|Pessoal", "valorAlvo": 0.00 }`

// ── Parser JSON com 3 camadas de fallback ───────────────────────────────────

function parseJSON(str) {
  try { return JSON.parse(str) } catch {}
  const md = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (md) try { return JSON.parse(md[1].trim()) } catch {}
  const s = str.indexOf('{'), e = str.lastIndexOf('}')
  if (s !== -1 && e !== -1) try { return JSON.parse(str.slice(s, e + 1)) } catch {}
  throw new Error('no_json')
}

function validarResposta(json) {
  if (!json || typeof json !== 'object') return false
  if (!['automacao', 'conversa'].includes(json.modo)) return false
  if (json.modo === 'automacao') {
    if (!json.tipo || !Array.isArray(json.itens) || json.itens.length === 0) return false
  }
  return true
}

// ── Labels e ícones ──────────────────────────────────────────────────────────

const DIAS_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function recorrenciaLabel(item) {
  switch (item.recorrencia) {
    case 'diaria':         return 'Todos os dias'
    case 'fins_de_semana': return 'Fins de semana'
    case 'dias_semana':    return (item.diasSemana || []).map(d => DIAS_NOMES[d]).join(', ')
    default: return item.data ? item.data.split('-').reverse().slice(0, 2).join('/') : 'Uma vez'
  }
}

const COR_TIPO = {
  rotina:     'border-blue-100 bg-blue-50',
  financeiro: 'border-emerald-100 bg-emerald-50',
  estudo:     'border-purple-100 bg-purple-50',
  meta:       'border-amber-100 bg-amber-50',
}

const ICONE_TIPO = { rotina: '📋', financeiro: '💰', estudo: '📚', meta: '🎯' }

// ── PreviewItem ──────────────────────────────────────────────────────────────

function PreviewItem({ tipo, item }) {
  if (tipo === 'rotina') return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="font-medium text-slate-700 flex-1 min-w-0 truncate">{item.texto}</span>
      {item.horario && (
        <span className="text-xs text-slate-400 font-mono tabular-nums flex-shrink-0">{item.horario}</span>
      )}
      <span className={`text-xs flex-shrink-0 flex items-center gap-0.5 ${
        item.recorrencia !== 'unica' ? 'text-blue-500' : 'text-slate-400'
      }`}>
        {item.recorrencia !== 'unica' && <RefreshCw size={9} />}
        {recorrenciaLabel(item)}
      </span>
    </div>
  )

  if (tipo === 'financeiro') {
    const cor = item.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-500'
    return (
      <div className="flex items-center gap-2 py-1.5 text-sm">
        <span className={`text-xs font-bold ${cor} flex-shrink-0`}>
          {item.tipo === 'entrada' ? '↑' : '↓'}
        </span>
        <span className="font-medium text-slate-700 flex-1 min-w-0 truncate">{item.desc}</span>
        {item.valor != null && (
          <span className={`text-xs font-semibold flex-shrink-0 ${cor}`}>
            {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        )}
        {item.recorrente && (
          <span className="text-xs text-blue-400 flex items-center gap-0.5 flex-shrink-0">
            <RefreshCw size={9} /> mensal
          </span>
        )}
      </div>
    )
  }

  if (tipo === 'estudo') return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="font-medium text-slate-700 flex-1 min-w-0 truncate">{item.titulo}</span>
      {item.tipo && <span className="text-xs text-purple-500 flex-shrink-0">{item.tipo}</span>}
      {item.prioridade && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
          item.prioridade === 'Alta'  ? 'bg-red-50 text-red-500'
          : item.prioridade === 'Média' ? 'bg-amber-50 text-amber-500'
          : 'bg-green-50 text-green-600'
        }`}>{item.prioridade}</span>
      )}
    </div>
  )

  if (tipo === 'meta') return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="font-medium text-slate-700 flex-1 min-w-0 truncate">{item.titulo}</span>
      {item.area && <span className="text-xs text-amber-500 flex-shrink-0">{item.area}</span>}
      {item.valorAlvo > 0 && (
        <span className="text-xs text-slate-400 flex-shrink-0">
          {item.valorAlvo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )}
    </div>
  )

  return null
}

// ── Sugestões rápidas ────────────────────────────────────────────────────────

const SUGESTOES = [
  'Academia segunda a sexta às 18h',
  'Paguei R$50 no mercado hoje',
  'Revisão de Direito Constitucional, prioridade alta',
  'Meta: economizar R$5000 até dezembro',
  'Conta de energia vence dia 15, R$120',
  'Como posso organizar meu tempo melhor?',
]

// ── Guard de autenticação (sem hooks internos) ───────────────────────────────
// Separa o guard de auth dos hooks do painel — respeita as Regras dos Hooks

export default function ChatGlobal() {
  const { usuario } = useAuth()
  // Early return válido: nenhum outro hook foi chamado antes
  if (!usuario) return null
  return <ChatGlobalPanel usuario={usuario} />
}

// ── Painel com toda a lógica ──────────────────────────────────────────────────

function ChatGlobalPanel({ usuario }) {
  const [aberto, setAberto]       = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [input, setInput]         = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvandoId, setSalvandoId] = useState(null)
  const [ouvindo, setOuvindo]     = useState(false)

  const scrollRef        = useRef(null)
  const inputRef         = useRef(null)
  const reconhecimentoRef = useRef(null)
  const transcriptRef    = useRef('')
  const deveProcessarRef = useRef(false)

  // Auto-scroll ao adicionar mensagem ou carregar
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens, carregando])

  // Foca input ao abrir
  useEffect(() => {
    if (aberto && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [aberto])

  function addMsg(role, content, resultado = null) {
    const id = Date.now() + Math.random()
    setMensagens(prev => [...prev, { id, role, content, resultado, confirmado: false }])
    return id
  }

  // ── Microfone ─────────────────────────────────────────────────────────────

  function iniciarVoz() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    transcriptRef.current = ''
    deveProcessarRef.current = false

    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    rec.onstart  = () => setOuvindo(true)
    rec.onresult = (e) => {
      let finalP = '', interimP = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalP += e.results[i][0].transcript + ' '
        else interimP += e.results[i][0].transcript
      }
      transcriptRef.current += finalP
      setInput(transcriptRef.current + interimP)
    }
    rec.onend = () => {
      setOuvindo(false)
      const final = transcriptRef.current.trim()
      if (final) setInput(final)
      if (deveProcessarRef.current && final) enviar(final)
      deveProcessarRef.current = false
    }
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setOuvindo(false)
    }

    reconhecimentoRef.current = rec
    rec.start()
  }

  function pararVoz() {
    deveProcessarRef.current = true
    reconhecimentoRef.current?.stop()
  }

  // ── Enviar mensagem ───────────────────────────────────────────────────────

  async function enviar(textoForce) {
    const text = (textoForce ?? input).trim()
    if (!text || carregando) return

    setInput('')
    addMsg('user', text)
    setCarregando(true)

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: `${contextoData()}\n\nMensagem: "${text}"` }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      })

      if (!res.ok) throw new Error(res.status === 429 ? 'rate_limit' : 'api_error')

      const data     = await res.json()
      const resposta = data.choices?.[0]?.message?.content || '{}'
      const json     = parseJSON(resposta)

      if (!validarResposta(json)) throw new Error('invalid_response')

      addMsg('ai', json.resposta, json)
    } catch (e) {
      const msg =
        e.message === 'rate_limit'       ? 'Limite da API atingido. Aguarde um minuto.' :
        e.message === 'invalid_response' ? 'Resposta fora do formato esperado. Tente novamente.' :
                                           'Erro ao processar. Verifique sua conexão.'
      addMsg('ai', msg, null)
    } finally {
      setCarregando(false)
    }
  }

  // ── Confirmar automação ───────────────────────────────────────────────────

  async function confirmarMsg(msgId, resultado) {
    if (!resultado || resultado.modo !== 'automacao' || !usuario) return
    setSalvandoId(msgId)
    try {
      for (const item of resultado.itens) {
        if (resultado.tipo === 'rotina')     await salvarRotina(usuario.uid, item)
        if (resultado.tipo === 'financeiro') await salvarFinanceiro(usuario.uid, item)
        if (resultado.tipo === 'estudo')     await salvarEstudo(usuario.uid, item)
        if (resultado.tipo === 'meta')       await salvarMeta(usuario.uid, item)
      }
      setMensagens(prev =>
        prev.map(m => m.id === msgId ? { ...m, confirmado: true } : m)
      )
    } catch {
      // erro silencioso — mensagem fica com botão para tentar de novo
    } finally {
      setSalvandoId(null)
    }
  }

  function cancelarMsg(msgId) {
    setMensagens(prev =>
      prev.map(m => m.id === msgId ? { ...m, confirmado: true } : m)
    )
  }

  // ── Funções de save ───────────────────────────────────────────────────────

  async function salvarRotina(uid, item) {
    const turno    = turnoDeHorario(item.horario)
    const dataBase = item.data || toISO(new Date())

    if (!item.recorrencia || item.recorrencia === 'unica') {
      await addDoc(collection(db, 'usuarios', uid, 'rotina'), {
        texto: item.texto, turno, horario: item.horario || null,
        feito: false, data: dataBase, criadoEm: Date.now()
      })
      return
    }

    const lote = writeBatch(db)
    const hoje = new Date()
    let diasValidos = item.diasSemana || []
    if (item.recorrencia === 'fins_de_semana') diasValidos = [0, 6]

    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje); d.setDate(d.getDate() + i)
      const incluir = item.recorrencia === 'diaria' || diasValidos.includes(d.getDay())
      if (incluir) {
        lote.set(doc(collection(db, 'usuarios', uid, 'rotina')), {
          texto: item.texto, turno, horario: item.horario || null,
          feito: false, data: toISO(d), recorrente: true, criadoEm: Date.now()
        })
      }
    }
    await lote.commit()
  }

  async function salvarFinanceiro(uid, item) {
    const hoje   = hojeISO()
    const mesDoc = item.dataVencimento ? item.dataVencimento.substring(0, 7) : mesAtual()
    const isPago = !item.dataVencimento || item.dataVencimento <= hoje

    const docData = {
      desc: item.desc, valor: item.valor, tipo: item.tipo,
      cat: item.cat || 'Outro', mes: mesDoc,
      dataVencimento: item.dataVencimento || null,
      pago: isPago, recorrente: item.recorrente || false,
      criadoEm: Date.now()
    }

    if (!item.recorrente) {
      await addDoc(collection(db, 'usuarios', uid, 'financeiro'), docData)
      return
    }

    const lote = writeBatch(db)
    const [baseY, baseM, baseD] = (item.dataVencimento || `${mesAtual()}-01`).split('-').map(Number)
    for (let i = 0; i < 12; i++) {
      const totalM = (baseM - 1) + i
      const y = baseY + Math.floor(totalM / 12)
      const m = (totalM % 12) + 1
      const mesI  = `${y}-${String(m).padStart(2, '0')}`
      const diaI  = String(baseD || 1).padStart(2, '0')
      const dataI = `${mesI}-${diaI}`
      lote.set(doc(collection(db, 'usuarios', uid, 'financeiro')), {
        ...docData, mes: mesI, dataVencimento: dataI,
        pago: dataI <= hoje, criadoEm: Date.now() + i
      })
    }
    await lote.commit()
  }

  async function salvarEstudo(uid, item) {
    await addDoc(collection(db, 'usuarios', uid, 'estudos'), {
      titulo: item.titulo, tipo: item.tipo || 'Estudo',
      prioridade: item.prioridade || 'Média',
      dataEstudo: item.dataEstudo || null,
      feito: false, criadoEm: Date.now()
    })
  }

  async function salvarMeta(uid, item) {
    await addDoc(collection(db, 'usuarios', uid, 'metas'), {
      titulo: item.titulo, area: item.area || 'Pessoal',
      valorAlvo: item.valorAlvo || null,
      totalDepositado: 0, feito: false, criadoEm: Date.now()
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Anel de pulso (só quando fechado) */}
        {!aberto && (
          <span className="absolute inset-0 rounded-full chat-btn-pulse" />
        )}
        <button
          onClick={() => setAberto(o => !o)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center transition-all duration-200 active:scale-95"
          title="Assistente IA"
        >
          <span className={`transition-all duration-200 ${aberto ? 'rotate-0' : 'rotate-0'}`}>
            {aberto ? <X size={22} /> : <MessageCircle size={22} />}
          </span>
        </button>
      </div>

      {/* Painel de chat */}
      {aberto && (
        <div
          className="fixed inset-x-0 bottom-0 sm:inset-auto sm:right-6 sm:bottom-24 z-40 flex flex-col bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-slate-900/15 border border-slate-200/60 overflow-hidden animate-fade-in"
          style={{ height: '580px', maxHeight: '85vh', width: undefined }}
        >

          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100/80 flex-shrink-0 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-400/40">
                <MessageCircle size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Assistente IA</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-slate-400">Groq · llama-3.3-70b</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAberto(false)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">

            {/* Estado inicial com sugestões */}
            {mensagens.length === 0 && (
              <div className="text-center pt-2 pb-4 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle size={22} className="text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Olá! Sou seu assistente.</p>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Posso criar tarefas, registrar gastos,<br />adicionar estudos e metas pra você.
                </p>
                <div className="space-y-2 text-left">
                  {SUGESTOES.map(s => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="w-full text-left text-xs text-slate-600 bg-slate-50/80 hover:bg-blue-50 hover:text-blue-700 border border-slate-100 hover:border-blue-200 rounded-xl px-3.5 py-2.5 transition-all duration-150"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de mensagens */}
            <div className="space-y-3">
              {mensagens.map(msg => (
                <div key={msg.id} className={`flex message-enter ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                  {msg.role === 'user' ? (
                    /* Mensagem do usuário */
                    <div className="max-w-[80%] bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed shadow-sm shadow-blue-400/20">
                      {msg.content}
                    </div>
                  ) : (
                    /* Mensagem da IA */
                    <div className="max-w-[90%] space-y-2">

                      {/* Badge de modo */}
                      {msg.resultado && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                          msg.resultado.modo === 'conversa'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {msg.resultado.modo === 'conversa'
                            ? <><MessageCircle size={9} /> Conversa</>
                            : <><Zap size={9} /> Automação</>
                          }
                        </span>
                      )}

                      {/* Bolha de texto */}
                      <div className="bg-slate-100/90 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-slate-700 leading-relaxed">
                        {msg.content}
                      </div>

                      {/* Card de automação (confirmar/cancelar) */}
                      {msg.resultado?.modo === 'automacao' && !msg.confirmado && (
                        <div className={`border rounded-2xl p-3 ${COR_TIPO[msg.resultado.tipo] || 'border-gray-100 bg-gray-50'}`}>
                          <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
                            <span>{ICONE_TIPO[msg.resultado.tipo]}</span>
                            {msg.resultado.itens.length === 1
                              ? '1 item será salvo'
                              : `${msg.resultado.itens.length} itens serão salvos`}
                            {msg.resultado.tipo === 'rotina' && msg.resultado.itens.some(i => i.recorrencia !== 'unica') &&
                              ' · 30 dias'}
                            {msg.resultado.tipo === 'financeiro' && msg.resultado.itens.some(i => i.recorrente) &&
                              ' · 12 meses'}
                          </div>

                          <div className="bg-white/70 rounded-xl px-3 py-1 mb-3 divide-y divide-gray-100">
                            {msg.resultado.itens.map((item, i) => (
                              <PreviewItem key={i} tipo={msg.resultado.tipo} item={item} />
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmarMsg(msg.id, msg.resultado)}
                              disabled={salvandoId === msg.id}
                              className="flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition disabled:opacity-50 shadow-sm"
                            >
                              {salvandoId === msg.id
                                ? <><Loader size={11} className="animate-spin" /> Salvando...</>
                                : <><Check size={11} className="text-emerald-500" /> Confirmar</>
                              }
                            </button>
                            <button
                              onClick={() => cancelarMsg(msg.id)}
                              className="text-xs text-slate-400 hover:text-slate-600 transition px-2"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Confirmado */}
                      {msg.resultado?.modo === 'automacao' && msg.confirmado && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <Check size={12} /> Salvo com sucesso!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Indicador de digitação */}
            {carregando && (
              <div className="flex justify-start mt-3 message-enter">
                <div className="bg-slate-100/90 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-slate-100/80 px-3 py-3 flex items-center gap-2 bg-white/60">
            <button
              onClick={ouvindo ? pararVoz : iniciarVoz}
              disabled={carregando}
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                ouvindo
                  ? 'bg-red-50 text-red-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={ouvindo ? 'Parar gravação' : 'Gravar voz'}
            >
              {ouvindo ? <Square size={15} /> : <Mic size={15} />}
            </button>

            <input
              ref={inputRef}
              className="flex-1 text-sm outline-none bg-slate-50/80 rounded-xl px-3.5 py-2.5 text-slate-700 placeholder:text-slate-300 border border-slate-200/60 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50/80 transition-all duration-150"
              placeholder={ouvindo ? '🎤 Ouvindo...' : 'Escreva uma mensagem...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
              disabled={carregando || ouvindo}
            />

            <button
              onClick={() => enviar()}
              disabled={!input.trim() || carregando || ouvindo}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white flex items-center justify-center flex-shrink-0 transition-all duration-150 disabled:opacity-30 active:scale-95 shadow-sm shadow-blue-400/30 disabled:shadow-none"
            >
              {carregando
                ? <Loader size={15} className="animate-spin" />
                : <Send size={15} />
              }
            </button>
          </div>
        </div>
      )}
    </>
  )
}
