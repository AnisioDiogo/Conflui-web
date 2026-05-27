import { useState, useRef } from 'react'
import { Mic, Square, Send, Loader, Check, X, RefreshCw, MessageCircle, Zap } from 'lucide-react'
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
// Separado do contexto do usuário para melhor seguimento de instruções

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
  // Camada 1: parse direto (funciona com response_format: json_object)
  try { return JSON.parse(str) } catch {}
  // Camada 2: extrai de bloco markdown ```json ... ```
  const md = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (md) try { return JSON.parse(md[1].trim()) } catch {}
  // Camada 3: extrai do primeiro { ao último }
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

// ── Labels de recorrência ────────────────────────────────────────────────────

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
  financeiro: 'border-green-100 bg-green-50',
  estudo:     'border-purple-100 bg-purple-50',
  meta:       'border-amber-100 bg-amber-50',
}

const ICONE_TIPO = { rotina: '📋', financeiro: '💰', estudo: '📚', meta: '🎯' }

// ── Preview de cada item antes de confirmar ──────────────────────────────────

function PreviewItem({ tipo, item }) {
  if (tipo === 'rotina') return (
    <div className="flex items-center gap-2 py-1 text-sm">
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
      <div className="flex items-center gap-2 py-1 text-sm">
        <span className={`text-xs font-bold ${cor} flex-shrink-0`}>
          {item.tipo === 'entrada' ? '↑' : '↓'}
        </span>
        <span className="font-medium text-slate-700 flex-1 min-w-0 truncate">{item.desc}</span>
        {item.valor != null && (
          <span className={`text-xs font-semibold flex-shrink-0 ${cor}`}>
            {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        )}
        {item.dataVencimento && (
          <span className="text-xs text-slate-400 flex-shrink-0">
            · {item.dataVencimento.split('-').reverse().slice(0, 2).join('/')}
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
    <div className="flex items-center gap-2 py-1 text-sm">
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
    <div className="flex items-center gap-2 py-1 text-sm">
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

// ── Componente principal ─────────────────────────────────────────────────────

export default function Assistente() {
  const { usuario } = useAuth()
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  const reconhecimentoRef = useRef(null)
  const transcriptRef     = useRef('')
  const deveProcessarRef  = useRef(false)

  // ── Microfone contínuo ────────────────────────────────────────────────────

  function iniciarVoz() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setErro('Reconhecimento de voz não suportado. Use o Chrome.'); return }

    transcriptRef.current = ''
    deveProcessarRef.current = false
    setTexto(''); setResultado(null); setErro('')

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
      setTexto(transcriptRef.current + interimP)
    }
    rec.onend = () => {
      setOuvindo(false)
      const final = transcriptRef.current.trim()
      if (final) setTexto(final)
      if (deveProcessarRef.current && final) processarComIA(final)
      deveProcessarRef.current = false
    }
    rec.onerror = (e) => {
      if (e.error !== 'aborted') { setOuvindo(false); setErro('Não consegui ouvir. Tente novamente.') }
    }

    reconhecimentoRef.current = rec
    rec.start()
  }

  function pararVoz() {
    deveProcessarRef.current = true
    reconhecimentoRef.current?.stop()
  }

  // ── Groq API — prompt em 2 partes (system + user) ─────────────────────────

  async function processarComIA(input) {
    if (!input.trim()) return
    setCarregando(true); setErro(''); setResultado(null)

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
            { role: 'user',   content: `${contextoData()}\n\nMensagem: "${input}"` }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }  // garante JSON puro na resposta
        })
      })

      if (!res.ok) {
        if (res.status === 429) throw new Error('rate_limit')
        throw new Error('api_error')
      }

      const data     = await res.json()
      const resposta = data.choices?.[0]?.message?.content || '{}'
      const json     = parseJSON(resposta)

      if (!validarResposta(json)) throw new Error('invalid_response')
      setResultado(json)
    } catch (e) {
      if      (e.message === 'rate_limit')       setErro('Limite da API atingido. Aguarde um minuto.')
      else if (e.message === 'no_json')          setErro('A IA não respondeu corretamente. Tente novamente.')
      else if (e.message === 'invalid_response') setErro('Resposta da IA fora do formato esperado. Tente novamente.')
      else setErro('Erro ao processar. Verifique sua conexão e tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  // ── Salvar no Firebase (suporta array de itens) ──────────────────────────

  async function confirmar() {
    if (!resultado || resultado.modo !== 'automacao') return
    const uid = usuario.uid
    setSalvando(true)
    try {
      for (const item of resultado.itens) {
        if (resultado.tipo === 'rotina')     await salvarRotina(uid, item)
        if (resultado.tipo === 'financeiro') await salvarFinanceiro(uid, item)
        if (resultado.tipo === 'estudo')     await salvarEstudo(uid, item)
        if (resultado.tipo === 'meta')       await salvarMeta(uid, item)
      }
      setResultado(null); setTexto('')
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

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

  function cancelar() { setResultado(null); setTexto(''); setErro('') }

  // ── Render ───────────────────────────────────────────────────────────────

  const isConversa  = resultado?.modo === 'conversa'
  const isAutomacao = resultado?.modo === 'automacao'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-gray-700">Assistente IA</p>
        {resultado && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
            isConversa ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
          }`}>
            {isConversa
              ? <><MessageCircle size={9} /> Conversa</>
              : <><Zap size={9} /> Automação</>
            }
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Fale ou escreva: "academia segunda a sexta às 18h", "gastei 50 no mercado", "estou preocupado com minhas contas"...
      </p>

      {/* Input de texto */}
      <div className="relative mb-3">
        <input
          className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition pr-24 ${
            ouvindo
              ? 'border-red-300 ring-2 ring-red-50 bg-red-50/30'
              : 'border-gray-200 focus:border-blue-300'
          }`}
          placeholder={ouvindo ? 'Ouvindo...' : 'Digite ou use o microfone...'}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !ouvindo && processarComIA(texto)}
          disabled={carregando || salvando}
        />
        {ouvindo && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 font-medium">Gravando</span>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={ouvindo ? pararVoz : iniciarVoz}
          disabled={carregando || salvando}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
            ouvindo
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          {ouvindo ? <><Square size={13} /> Parar</> : <><Mic size={13} /> Gravar</>}
        </button>

        <button
          onClick={() => processarComIA(texto)}
          disabled={!texto.trim() || carregando || ouvindo || salvando}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl py-2 text-sm font-medium transition disabled:opacity-30"
        >
          {carregando
            ? <><Loader size={13} className="animate-spin" /> Processando...</>
            : <><Send size={13} /> Enviar</>
          }
        </button>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <p className="text-xs text-red-400 mb-3 bg-red-50 px-3 py-2 rounded-xl">{erro}</p>
      )}

      {/* ── Modo CONVERSA: bolha de resposta ── */}
      {isConversa && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-start gap-2.5">
            <span className="text-lg mt-0.5 flex-shrink-0">🤖</span>
            <p className="text-sm text-slate-700 leading-relaxed">{resultado.resposta}</p>
          </div>
          <button
            onClick={cancelar}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ── Modo AUTOMAÇÃO: preview + confirmar ── */}
      {isAutomacao && (
        <div className={`border rounded-2xl p-4 ${COR_TIPO[resultado.tipo] || 'border-gray-100 bg-gray-50'}`}>

          {/* Mensagem da IA */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base flex-shrink-0">{ICONE_TIPO[resultado.tipo]}</span>
            <p className="text-sm text-slate-700">{resultado.resposta}</p>
          </div>

          {/* Preview dos itens que serão salvos */}
          <div className="bg-white/70 rounded-xl px-3 py-2 mb-3 divide-y divide-gray-100">
            {resultado.itens.map((item, i) => (
              <PreviewItem key={i} tipo={resultado.tipo} item={item} />
            ))}
          </div>

          <p className="text-xs text-slate-400 mb-3">
            {resultado.itens.length === 1
              ? '1 item será salvo'
              : `${resultado.itens.length} itens serão salvos`}
            {resultado.tipo === 'rotina' && resultado.itens.some(i => i.recorrencia !== 'unica')
              ? ' (cria instâncias nos próximos 30 dias)'
              : ''}
            {resultado.tipo === 'financeiro' && resultado.itens.some(i => i.recorrente)
              ? ' (cria lançamentos nos próximos 12 meses)'
              : ''}
          </p>

          <div className="flex gap-2">
            <button
              onClick={confirmar}
              disabled={salvando}
              className="flex items-center gap-1.5 bg-white text-gray-700 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50 shadow-sm"
            >
              {salvando
                ? <><Loader size={13} className="animate-spin" /> Salvando...</>
                : <><Check size={13} className="text-green-500" /> Confirmar</>
              }
            </button>
            <button
              onClick={cancelar}
              className="flex items-center gap-1.5 bg-white/70 text-gray-500 border border-gray-100 rounded-xl px-4 py-2 text-sm font-medium hover:bg-white transition"
            >
              <X size={13} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
