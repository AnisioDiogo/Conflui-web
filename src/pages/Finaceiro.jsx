import { useState, useEffect, useMemo, useRef } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db, storage } from '../firebase'
import {
  collection, addDoc, onSnapshot,
  deleteDoc, updateDoc, doc, query, orderBy, writeBatch
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Paperclip, ExternalLink, X, Check, RotateCcw,
} from 'lucide-react'

// ── Utilitários ───────────────────────────────────────────────────────────────

const categorias = {
  entrada: ['Salário', 'Freelance', 'Presente', 'Outro'],
  saida:   ['Alimentação', 'Transporte', 'Estudo', 'Saúde', 'Lazer', 'Contas', 'Cartão', 'Outro'],
}

function fmt(n) {
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Formulário ────────────────────────────────────────────────────────────────

function FormularioLancamento({ uid }) {
  const [desc,         setDesc]         = useState('')
  const [valor,        setValor]        = useState('')
  const [tipo,         setTipo]         = useState('saida')
  const [cat,          setCat]          = useState('Alimentação')
  const [dataVenc,     setDataVenc]     = useState('')
  const [recorrente,   setRecorrente]   = useState(false)
  const [observacao,   setObservacao]   = useState('')
  const [pix,          setPix]          = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [arquivo,      setArquivo]      = useState(null)
  const [salvando,     setSalvando]     = useState(false)
  const [expandido,    setExpandido]    = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { setCat(categorias[tipo][0]) }, [tipo])

  async function adicionar() {
    const v = parseFloat(valor.replace(',', '.'))
    if (!desc.trim() || isNaN(v) || v <= 0) return
    setSalvando(true)

    const hoje   = hojeISO()
    const mesDoc = dataVenc ? dataVenc.substring(0, 7) : mesAtual()
    const isPago = !dataVenc || dataVenc <= hoje

    // Upload do anexo (Firebase Storage)
    let anexoUrl  = null
    let anexoNome = null
    if (arquivo) {
      try {
        const sRef = ref(storage, `usuarios/${uid}/financeiro/${Date.now()}_${arquivo.name}`)
        await uploadBytes(sRef, arquivo)
        anexoUrl  = await getDownloadURL(sRef)
        anexoNome = arquivo.name
      } catch (err) {
        console.warn('[Financeiro] Erro no upload:', err)
      }
    }

    const docData = {
      desc, valor: v, tipo, cat,
      mes: mesDoc,
      dataVencimento: dataVenc || null,
      pago: isPago,
      recorrente,
      // Campos novos (null se vazio — retrocompatível com registros antigos)
      observacao:   observacao.trim()   || null,
      pix:          pix.trim()          || null,
      codigoBarras: codigoBarras.trim() || null,
      anexoUrl,
      anexoNome,
      criadoEm: Date.now(),
    }

    const colecao = collection(db, 'usuarios', uid, 'financeiro')

    if (!recorrente) {
      await addDoc(colecao, docData)
    } else {
      const lote = writeBatch(db)
      const [baseY, baseM, baseD] = (dataVenc || `${mesAtual()}-01`).split('-').map(Number)
      for (let i = 0; i < 12; i++) {
        const totalM = (baseM - 1) + i
        const y = baseY + Math.floor(totalM / 12)
        const m = (totalM % 12) + 1
        const mesI  = `${y}-${String(m).padStart(2, '0')}`
        const diaI  = String(baseD || 1).padStart(2, '0')
        const dataI = `${mesI}-${diaI}`
        lote.set(doc(collection(db, 'usuarios', uid, 'financeiro')), {
          ...docData,
          mes: mesI,
          dataVencimento: dataI,
          pago: dataI <= hoje,
          criadoEm: Date.now() + i,
        })
      }
      await lote.commit()
    }

    // Reset completo
    setDesc(''); setValor(''); setDataVenc(''); setRecorrente(false)
    setObservacao(''); setPix(''); setCodigoBarras(''); setArquivo(null)
    setExpandido(false)
    if (fileRef.current) fileRef.current.value = ''
    setSalvando(false)
  }

  return (
    <div className="card p-4 mb-5">
      <p className="text-sm font-semibold text-slate-700 mb-3">Novo lançamento</p>

      {/* Linha 1: descrição + valor — empilha em mobile */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          className="input-base flex-1"
          placeholder="Descrição *"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <input
          className="input-base sm:w-28"
          placeholder="Valor *"
          inputMode="decimal"
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && adicionar()}
        />
      </div>

      {/* Linha 2: tipo + categoria + botão — empilha em mobile */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <select className="input-base sm:flex-1" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="entrada">↑ Entrada</option>
          <option value="saida">↓ Saída</option>
        </select>
        <select className="input-base sm:flex-1" value={cat} onChange={e => setCat(e.target.value)}>
          {categorias[tipo].map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          onClick={adicionar}
          disabled={salvando}
          className="btn-primary flex items-center justify-center gap-1.5"
        >
          {salvando ? <RotateCcw size={14} className="animate-spin" /> : <Plus size={14} />}
          {salvando ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>

      {/* Vencimento + recorrente */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-50 mt-1">
        <div className="flex-1">
          <label className="text-xs text-slate-400 block mb-1">Vencimento (opcional)</label>
          <input type="date" className="input-base" value={dataVenc} onChange={e => setDataVenc(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer sm:mt-5">
          <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={recorrente} onChange={e => setRecorrente(e.target.checked)} />
          <div>
            <p className="text-xs font-medium text-slate-600">Mensal</p>
            <p className="text-xs text-slate-400">12 meses</p>
          </div>
        </label>
      </div>

      {/* Toggle campos extras */}
      <button
        onClick={() => setExpandido(e => !e)}
        className="flex items-center gap-1.5 mt-3 text-xs text-slate-400 hover:text-slate-600 transition"
      >
        {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expandido ? 'Menos opções' : 'Mais opções (obs., Pix, código de barras, anexo)'}
      </button>

      {expandido && (
        <div className="mt-3 space-y-3 border-t border-slate-50 pt-3">
          {/* Observação */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Observação</label>
            <textarea
              className="input-base resize-none text-sm"
              rows={2}
              placeholder="Anotações, referências, detalhes..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
            />
          </div>

          {/* Pix + código de barras */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Chave Pix</label>
              <input className="input-base" placeholder="CPF, e-mail, telefone..." value={pix} onChange={e => setPix(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Código de barras</label>
              <input className="input-base font-mono text-xs" placeholder="00000.00000..." value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)} />
            </div>
          </div>

          {/* Anexo */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Anexo (PDF, imagem, boleto)</label>
            {arquivo ? (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50 border border-blue-100">
                <Paperclip size={13} className="text-blue-500 flex-shrink-0" />
                <span className="text-xs text-blue-700 truncate flex-1">{arquivo.name}</span>
                <button onClick={() => { setArquivo(null); if (fileRef.current) fileRef.current.value = '' }}>
                  <X size={12} className="text-blue-400 hover:text-blue-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition text-xs text-slate-400 hover:text-blue-500"
              >
                <Paperclip size={13} />
                Clique para selecionar arquivo
              </button>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={e => setArquivo(e.target.files?.[0] || null)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Item da lista ─────────────────────────────────────────────────────────────

function ItemLancamento({ l, uid, onTogglePago, onDeletar }) {
  const [expandido, setExpandido] = useState(false)
  const hoje = hojeISO()

  function statusInfo() {
    if (l.pago) return { label: 'Pago', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
    if (l.dataVencimento && l.dataVencimento < hoje) return { label: 'Vencida', cls: 'bg-rose-50 text-rose-500 border-rose-100' }
    if (l.dataVencimento) return { label: 'Pendente', cls: 'bg-amber-50 text-amber-500 border-amber-100' }
    return null
  }

  const st       = statusInfo()
  const temExtras = l.observacao || l.pix || l.codigoBarras || l.anexoUrl

  async function deletarComAnexo() {
    if (l.anexoUrl && l.anexoNome) {
      try {
        const sRef = ref(storage, `usuarios/${uid}/financeiro/${l.anexoNome}`)
        await deleteObject(sRef).catch(() => {})
      } catch { /* silent */ }
    }
    onDeletar(l.id)
  }

  function copiar(texto) {
    navigator.clipboard?.writeText(texto).catch(() => {})
  }

  return (
    <div className="border-b border-slate-50 last:border-0">
      {/* Linha principal — responsiva */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        {/* Ícone tipo */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          l.tipo === 'entrada' ? 'bg-emerald-50' : 'bg-rose-50'
        }`}>
          <span className={`text-xs font-bold ${l.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {l.tipo === 'entrada' ? '↑' : '↓'}
          </span>
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 font-medium truncate">{l.desc}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0 mt-0.5">
            <span className="text-xs text-slate-400">{l.cat}</span>
            {l.dataVencimento && (
              <span className="text-xs text-slate-300">
                vence {l.dataVencimento.split('-').reverse().slice(0, 2).join('/')}
              </span>
            )}
            {l.recorrente && <span className="text-xs text-blue-400">↻</span>}
            {temExtras && (
              <button onClick={() => setExpandido(e => !e)} className="text-xs text-slate-300 hover:text-blue-400 transition">
                {expandido ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>

        {/* Valor */}
        <span className={`text-sm font-semibold flex-shrink-0 ${l.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-500'}`}>
          {l.tipo === 'entrada' ? '+' : '−'}{fmt(l.valor)}
        </span>

        {/* Badge — texto em sm+, ícone em mobile */}
        {st && (
          <>
            <button
              onClick={() => onTogglePago(l.id, l.pago)}
              className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full font-medium border transition hover:opacity-70 flex-shrink-0 ${st.cls}`}
            >
              {st.label}
            </button>
            <button
              onClick={() => onTogglePago(l.id, l.pago)}
              className={`sm:hidden w-6 h-6 rounded-full flex items-center justify-center border flex-shrink-0 ${st.cls}`}
            >
              {l.pago && <Check size={10} />}
            </button>
          </>
        )}

        <button onClick={deletarComAnexo} className="w-6 h-6 flex items-center justify-center text-slate-200 hover:text-rose-400 transition flex-shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Detalhes expandíveis */}
      {expandido && temExtras && (
        <div className="px-3 sm:px-4 pb-3 space-y-2.5 bg-slate-50/50">
          {l.observacao && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Observação</p>
              <p className="text-xs text-slate-600 leading-relaxed">{l.observacao}</p>
            </div>
          )}
          {l.pix && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Chave Pix</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-slate-700 bg-white rounded-lg px-2 py-1 border border-slate-100 flex-1 break-all">{l.pix}</code>
                <button onClick={() => copiar(l.pix)} className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 font-medium">Copiar</button>
              </div>
            </div>
          )}
          {l.codigoBarras && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Código de barras</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-slate-700 bg-white rounded-lg px-2 py-1 border border-slate-100 flex-1 break-all font-mono">{l.codigoBarras}</code>
                <button onClick={() => copiar(l.codigoBarras)} className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 font-medium">Copiar</button>
              </div>
            </div>
          )}
          {l.anexoUrl && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Anexo</p>
              <a href={l.anexoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <Paperclip size={11} />
                {l.anexoNome || 'Abrir arquivo'}
                <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Financeiro() {
  const { usuario }                   = useAuth()
  const [lancamentos, setLancamentos] = useState([])
  const [mesFiltro,   setMesFiltro]   = useState(mesAtual())

  const colecao = collection(db, 'usuarios', usuario.uid, 'financeiro')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap =>
      setLancamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  async function togglePago(id, pago) {
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'financeiro', id), { pago: !pago })
  }

  async function deletar(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'financeiro', id))
  }

  const doMes = useMemo(
    () => lancamentos.filter(l => l.mes === mesFiltro),
    [lancamentos, mesFiltro]
  )

  const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas   = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo    = entradas - saidas

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-5 sm:py-8 page-enter">

        <h1 className="text-xl font-bold text-slate-800 mb-1">Financeiro</h1>
        <p className="text-sm text-slate-400 mb-5">Controle seus gastos e ganhos</p>

        {/* ── Resumo ─────────────────────────────���───────────────────────── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          <div className="card p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs font-medium text-slate-400 mb-1">Entradas</p>
            <p className="text-sm sm:text-base font-bold text-emerald-600 truncate">{fmt(entradas)}</p>
          </div>
          <div className="card p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs font-medium text-slate-400 mb-1">Saídas</p>
            <p className="text-sm sm:text-base font-bold text-rose-500 truncate">{fmt(saidas)}</p>
          </div>
          <div className="card p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs font-medium text-slate-400 mb-1">Saldo</p>
            <p className={`text-sm sm:text-base font-bold truncate ${saldo >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
              {fmt(saldo)}
            </p>
          </div>
        </div>

        {/* ── Formulário ────────────────────────────────��────────────────── */}
        <FormularioLancamento uid={usuario.uid} />

        {/* ── Filtro de mês ─────────────────────────────────────────────��── */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">
            Lançamentos
            {doMes.length > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">({doMes.length})</span>}
          </p>
          <input
            type="month"
            className="border border-slate-200 rounded-xl px-2 sm:px-3 py-1.5 text-xs sm:text-sm outline-none text-slate-600 focus:border-blue-400 transition"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
          />
        </div>

        {/* ── Lista ──────────────────────────────────────────────────────── */}
        {doMes.length === 0 ? (
          <div className="text-center py-16 text-slate-300 text-sm">Nenhum lançamento neste mês</div>
        ) : (
          <div className="card overflow-hidden">
            {doMes.map(l => (
              <ItemLancamento
                key={l.id}
                l={l}
                uid={usuario.uid}
                onTogglePago={togglePago}
                onDeletar={deletar}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
