import { useState, useRef } from 'react'
import { Mic, MicOff, Send, Loader, Check, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { collection, addDoc } from 'firebase/firestore'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY

export default function Assistente() {
  const { usuario } = useAuth()
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const reconhecimentoRef = useRef(null)

  // Inicia o microfone
  function iniciarVoz() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setErro('Seu navegador não suporta reconhecimento de voz. Use o Chrome.')
      return
    }
    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false

    rec.onstart = () => setOuvindo(true)
    rec.onend = () => setOuvindo(false)
    rec.onerror = () => {
      setOuvindo(false)
      setErro('Não consegui ouvir. Tente novamente.')
    }
    rec.onresult = (e) => {
      const fala = e.results[0][0].transcript
      setTexto(fala)
      processarComIA(fala)
    }

    reconhecimentoRef.current = rec
    rec.start()
  }

  function pararVoz() {
    reconhecimentoRef.current?.stop()
    setOuvindo(false)
  }

  // Manda pra Gemini entender
  async function processarComIA(input) {
    if (!input.trim()) return
    setCarregando(true)
    setErro('')
    setResultado(null)

    // Aguarda 1 segundo pra não sobrecarregar a API
    await new Promise(r => setTimeout(r, 1000))

    const prompt = `
Você é um assistente de organização pessoal. O usuário vai te dizer algo em linguagem natural e você deve identificar a intenção e extrair os dados.

Mensagem do usuário: "${input}"

Responda APENAS com um JSON válido, sem explicações, sem markdown, sem código, sem texto extra. Só o JSON.

O JSON deve ter essa estrutura:
{
  "tipo": "financeiro" | "rotina" | "estudo" | "meta" | "nao_entendi",
  "dados": {
    // Para financeiro:
    "desc": "descrição do gasto ou ganho",
    "valor": 0.00,
    "tipo": "entrada" | "saida",
    "cat": "Alimentação" | "Transporte" | "Estudo" | "Saúde" | "Lazer" | "Contas" | "Salário" | "Freelance" | "Outro",
    
    // Para rotina:
    "texto": "descrição da tarefa",
    "turno": "Manhã" | "Tarde" | "Noite",
    
    // Para estudo:
    "titulo": "título do material",
    "tipo_estudo": "Artigo" | "Vídeo" | "Livro" | "Revisão" | "Exercício",
    "prioridade": "Alta" | "Média" | "Baixa",
    
    // Para meta:
    "titulo": "descrição da meta",
    "area": "Financeiro" | "Estudo" | "Saúde" | "Carreira" | "Pessoal"
  },
  "mensagem": "frase curta confirmando o que entendeu, em português"
}
`

     let res
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      )
       const data = await res.json()
      console.log('Resposta Gemini:', data) // <- adiciona essa linha
      const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Limpa possíveis marcações de markdown
      const limpo = resposta.replace(/```json|```/g, '').trim()
      const json = JSON.parse(limpo)
      setResultado(json)

     } catch (e) {
      console.error('Erro:', e)
      const status = res?.status
      if (status === 429) {
        setErro('Limite da API atingido. Aguarde 1 minuto e tente novamente.')
      } else if (status === 404) {
        setErro('Modelo não encontrado. Verifique a chave da API.')
      } else {
        setErro('Não consegui entender. Tente reformular.')
      }
    } finally {
      setCarregando(false)
    }
  }

  // Salva no Firebase conforme o tipo
  async function confirmar() {
    if (!resultado) return
    const uid = usuario.uid
    const { tipo, dados } = resultado

    try {
      if (tipo === 'financeiro') {
        await addDoc(collection(db, 'usuarios', uid, 'financeiro'), {
          desc: dados.desc,
          valor: dados.valor,
          tipo: dados.tipo,
          cat: dados.cat,
          mes: mesAtual(),
          criadoEm: Date.now()
        })
      } else if (tipo === 'rotina') {
        await addDoc(collection(db, 'usuarios', uid, 'rotina'), {
          texto: dados.texto,
          turno: dados.turno,
          feito: false,
          criadoEm: Date.now()
        })
      } else if (tipo === 'estudo') {
        await addDoc(collection(db, 'usuarios', uid, 'estudos'), {
          titulo: dados.titulo,
          tipo: dados.tipo_estudo,
          prioridade: dados.prioridade,
          feito: false,
          criadoEm: Date.now()
        })
      } else if (tipo === 'meta') {
        await addDoc(collection(db, 'usuarios', uid, 'metas'), {
          titulo: dados.titulo,
          area: dados.area,
          feito: false,
          criadoEm: Date.now()
        })
      }

      setResultado(null)
      setTexto('')
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.')
    }
  }

  function cancelar() {
    setResultado(null)
    setTexto('')
    setErro('')
  }

  function mesAtual() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const corTipo = {
    financeiro: 'bg-green-50 text-green-700',
    rotina: 'bg-blue-50 text-blue-700',
    estudo: 'bg-purple-50 text-purple-700',
    meta: 'bg-amber-50 text-amber-700',
    nao_entendi: 'bg-red-50 text-red-500'
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-sm font-medium text-gray-700 mb-1">Assistente IA</p>
      <p className="text-xs text-gray-400 mb-4">
        Fale ou digite: "gastei 30 reais no almoço", "estudar React hoje à tarde", "meta de guardar 500 reais"...
      </p>

      {/* Input + botões */}
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
          placeholder="Digite ou clique no microfone..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && processarComIA(texto)}
          disabled={ouvindo || carregando}
        />
        <button
          onClick={ouvindo ? pararVoz : iniciarVoz}
          disabled={carregando}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
            ouvindo
              ? 'bg-red-50 text-red-500 animate-pulse'
              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
          }`}
        >
          {ouvindo ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => processarComIA(texto)}
          disabled={!texto.trim() || carregando || ouvindo}
          className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition disabled:opacity-30"
        >
          {carregando ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <p className="text-xs text-red-400 mb-3">{erro}</p>
      )}

      {/* Card de confirmação */}
      {resultado && resultado.tipo !== 'nao_entendi' && (
        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${corTipo[resultado.tipo]}`}>
              {resultado.tipo}
            </span>
            <p className="text-sm text-gray-700">{resultado.mensagem}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmar}
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition"
            >
              <Check size={14} />
              Confirmar
            </button>
            <button
              onClick={cancelar}
              className="flex items-center gap-1.5 bg-gray-50 text-gray-500 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100 transition"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {resultado?.tipo === 'nao_entendi' && (
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-sm text-red-500">{resultado.mensagem || 'Não entendi. Tente ser mais específico.'}</p>
        </div>
      )}
    </div>
  )
}