import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader, TrendingDown, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

const CORES = ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#fb923c', '#38bdf8']

export default function AnalisefinAnanceira({ lancamentos }) {
  const [analise, setAnalise] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function mesAtual() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const doMes = lancamentos.filter(l => l.mes === mesAtual())
  const entradas = doMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = doMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo = entradas - saidas

  // Agrupa gastos por categoria
  const porCategoria = doMes
    .filter(l => l.tipo === 'saida')
    .reduce((acc, l) => {
      acc[l.cat] = (acc[l.cat] || 0) + l.valor
      return acc
    }, {})

  const dadosPizza = Object.entries(porCategoria).map(([cat, valor]) => ({
    name: cat,
    value: parseFloat(valor.toFixed(2))
  }))

  function fmt(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function analisarComIA() {
    if (doMes.length === 0) {
      setErro('Adicione lançamentos financeiros primeiro!')
      return
    }
    setCarregando(true)
    setErro('')
    setAnalise(null)

    const resumo = `
Mês atual - Resumo financeiro:
- Total de entradas: ${fmt(entradas)}
- Total de saídas: ${fmt(saidas)}
- Saldo: ${fmt(saldo)}
- Gastos por categoria: ${Object.entries(porCategoria).map(([k, v]) => `${k}: ${fmt(v)}`).join(', ')}
- Total de lançamentos: ${doMes.length}
    `

    const prompt = `Você é um consultor financeiro pessoal. Analise os dados abaixo e responda APENAS com JSON válido.

${resumo}

Responda SOMENTE com este JSON, sem texto adicional:
{
  "situacao": "boa" | "atencao" | "critica",
  "frase_principal": "uma frase curta e direta sobre a situação financeira",
  "sugestoes": [
    "sugestão prática 1",
    "sugestão prática 2",
    "sugestão prática 3"
  ],
  "categoria_maior_gasto": "nome da categoria com maior gasto",
  "percentual_gasto": 0,
  "meta_economia": 0.00
}`

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Você responde APENAS com JSON válido, sem texto adicional, sem markdown.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          max_tokens: 400
        })
      })

      const data = await res.json()
      const texto = data.choices?.[0]?.message?.content?.trim() || ''
      const match = texto.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('JSON inválido')
      const json = JSON.parse(match[0])
      setAnalise(json)

    } catch (e) {
      setErro('Erro ao analisar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const corSituacao = {
    boa: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle, label: 'Situação boa' },
    atencao: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle, label: 'Atenção' },
    critica: { bg: 'bg-red-50', text: 'text-red-600', icon: TrendingDown, label: 'Situação crítica' }
  }

  return (
    <div className="space-y-4">

      {/* Resumo do mês */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Resumo do mês</p>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Entradas</p>
            <p className="text-base font-medium text-green-600">{fmt(entradas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Saídas</p>
            <p className="text-base font-medium text-red-400">{fmt(saidas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Saldo</p>
            <p className={`text-base font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {fmt(saldo)}
            </p>
          </div>
        </div>

        {/* Gráfico de pizza */}
        {dadosPizza.length > 0 ? (
          <>
            <p className="text-xs text-gray-400 mb-3">Gastos por categoria</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dadosPizza.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => fmt(val)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              {dadosPizza.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                  <span className="text-xs text-gray-500">{item.name}</span>
                  <span className="text-xs text-gray-400">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-300 text-center py-4">
            Nenhum gasto registrado ainda
          </p>
        )}
      </div>

      {/* Botão analisar */}
      <button
        onClick={analisarComIA}
        disabled={carregando}
        className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 rounded-2xl py-3.5 text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
      >
        {carregando
          ? <><Loader size={15} className="animate-spin" /> Analisando seus gastos...</>
          : <><TrendingUp size={15} /> Analisar com IA</>
        }
      </button>

      {erro && <p className="text-xs text-red-400 text-center">{erro}</p>}

      {/* Resultado da análise */}
      {analise && (
        <div className="space-y-3">

          {/* Situação geral */}
          {(() => {
            const cfg = corSituacao[analise.situacao] || corSituacao.atencao
            const Icon = cfg.icon
            return (
              <div className={`${cfg.bg} rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={cfg.text} />
                  <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                </div>
                <p className={`text-sm font-medium ${cfg.text}`}>{analise.frase_principal}</p>
              </div>
            )
          })()}

          {/* Sugestões */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-700 mb-3">Sugestões da IA</p>
            {analise.sugestoes?.map((s, i) => (
              <div key={i} className={`flex gap-3 py-2.5 ${i < analise.sugestoes.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-600">{s}</p>
              </div>
            ))}
          </div>

          {/* Meta de economia */}
          {analise.meta_economia > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Meta de economia sugerida</p>
                <p className="text-sm font-medium text-gray-700">{fmt(analise.meta_economia)} este mês</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}