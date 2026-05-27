import { createContext, useContext, useState, useCallback } from 'react'
import {
  CalendarCheck, Wallet, BookOpen, Trophy, Target,
  FolderKanban, Briefcase,
} from 'lucide-react'

// ── Catálogo completo de módulos ──────────────────────────────────────────────
// "emBreve: true" → mostrado em Configurações como desativável, mas sem rota ainda

export const TODOS_MODULOS = [
  {
    id: 'rotina',
    label: 'Rotina',
    icon: CalendarCheck,
    cor: 'text-emerald-500',
    bgCor: 'bg-emerald-50',
    path: '/rotina',
    desc: 'Tarefas diárias organizadas por turno',
    emBreve: false,
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    cor: 'text-green-500',
    bgCor: 'bg-green-50',
    path: '/financeiro',
    desc: 'Entradas, saídas e contas futuras',
    emBreve: false,
  },
  {
    id: 'estudos',
    label: 'Estudos',
    icon: BookOpen,
    cor: 'text-purple-500',
    bgCor: 'bg-purple-50',
    path: '/estudos',
    desc: 'Materiais de estudo e progresso',
    emBreve: false,
  },
  {
    id: 'concurso',
    label: 'Concurso',
    icon: Trophy,
    cor: 'text-amber-500',
    bgCor: 'bg-amber-50',
    path: '/concurso',
    desc: 'Preparação, disciplinas e documentos',
    emBreve: false,
  },
  {
    id: 'metas',
    label: 'Metas',
    icon: Target,
    cor: 'text-rose-500',
    bgCor: 'bg-rose-50',
    path: '/metas',
    desc: 'Objetivos financeiros e pessoais',
    emBreve: false,
  },
  {
    id: 'projetos',
    label: 'Projetos',
    icon: FolderKanban,
    cor: 'text-cyan-500',
    bgCor: 'bg-cyan-50',
    path: '/projetos',
    desc: 'Projetos pessoais e freelas com progresso',
    emBreve: false,
  },
  {
    id: 'vagas',
    label: 'Vagas',
    icon: Briefcase,
    cor: 'text-violet-500',
    bgCor: 'bg-violet-50',
    path: '/vagas',
    desc: 'Candidaturas e acompanhamento de processos',
    emBreve: false,
  },
]

// ── Estado padrão (primeira vez) ───────────────────────────────────────────────
const PADRAO = {
  rotina:     true,
  financeiro: true,
  estudos:    true,
  concurso:   true,
  metas:      true,
  projetos:   false,
  vagas:      false,
}

// ── localStorage helpers ───────────────────────────────────────────────────────
function lerModulos() {
  try {
    const raw = localStorage.getItem('modulos_ativos')
    if (raw) return { ...PADRAO, ...JSON.parse(raw) }
  } catch { /* silent */ }
  return { ...PADRAO }
}

function salvarModulos(m) {
  try { localStorage.setItem('modulos_ativos', JSON.stringify(m)) } catch { /* silent */ }
}

// ── Contexto ───────────────────────────────────────────────────────────────────
const ModulosContext = createContext({
  modulos: PADRAO,
  toggleModulo: () => {},
  moduloAtivo: () => true,
})

export function ModulosProvider({ children }) {
  const [modulos, setModulos] = useState(lerModulos)

  const toggleModulo = useCallback((id) => {
    setModulos(prev => {
      const next = { ...prev, [id]: !prev[id] }
      salvarModulos(next)
      return next
    })
  }, [])

  const moduloAtivo = useCallback((id) => !!modulos[id], [modulos])

  return (
    <ModulosContext.Provider value={{ modulos, toggleModulo, moduloAtivo }}>
      {children}
    </ModulosContext.Provider>
  )
}

export function useModulos() { return useContext(ModulosContext) }
