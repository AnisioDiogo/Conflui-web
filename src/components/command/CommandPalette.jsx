import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, LayoutDashboard, CalendarCheck, Wallet, BookOpen,
  Trophy, Target, FolderKanban, Briefcase, Settings, User,
  LogOut, Moon, Sun, Zap, ArrowRight,
} from 'lucide-react'
import { useModulos, TODOS_MODULOS } from '../../context/ModulosContext'
import { useTheme } from '../../context/ThemeContext'
import { auth } from '../../firebase'
import { signOut } from 'firebase/auth'

// ── Mapa de ícones por módulo ─────────────────────────────────────────────────

const ICON_MAP = {
  rotina:     CalendarCheck,
  financeiro: Wallet,
  estudos:    BookOpen,
  concurso:   Trophy,
  metas:      Target,
  projetos:   FolderKanban,
  vagas:      Briefcase,
}

// ── Hook: detecta Ctrl+K ──────────────────────────────────────────────────────

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { open, setOpen }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CommandPalette({ open, onClose }) {
  const navigate   = useNavigate()
  const { moduloAtivo } = useModulos()
  const { dark, toggleTheme } = useTheme()

  const [query,   setQuery]   = useState('')
  const [cursor,  setCursor]  = useState(0)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  // ── Construir lista de comandos ───────────────────────────────────────────

  const commands = useMemo(() => {
    const nav = [
      { id: 'dashboard', label: 'Ir para Dashboard',  icon: LayoutDashboard, group: 'Navegação', action: () => navigate('/dashboard') },
      ...TODOS_MODULOS
        .filter(m => moduloAtivo(m.id))
        .map(m => ({
          id:     m.id,
          label:  `Ir para ${m.label}`,
          icon:   ICON_MAP[m.id] || FolderKanban,
          group:  'Navegação',
          action: () => navigate(m.path),
          desc:   m.desc,
        })),
      { id: 'perfil',         label: 'Meu Perfil',           icon: User,           group: 'Navegação', action: () => navigate('/perfil') },
      { id: 'configuracoes',  label: 'Configurações',         icon: Settings,       group: 'Navegação', action: () => navigate('/configuracoes') },
    ]

    const acoes = [
      {
        id:     'toggle-dark',
        label:  dark ? 'Ativar modo claro' : 'Ativar modo escuro',
        icon:   dark ? Sun : Moon,
        group:  'Ações rápidas',
        action: () => { toggleTheme(); onClose() },
      },
      { id: 'sair', label: 'Sair da conta', icon: LogOut, group: 'Ações rápidas', action: () => { signOut(auth); onClose() } },
    ]

    return [...nav, ...acoes]
  }, [moduloAtivo, dark, navigate, toggleTheme, onClose])

  // ── Filtrar por query ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.desc || '').toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q)
    )
  }, [commands, query])

  // ── Agrupar ───────────────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((cmd, idx) => {
      if (!map[cmd.group]) map[cmd.group] = []
      map[cmd.group].push({ ...cmd, _idx: idx })
    })
    return map
  }, [filtered])

  // ── Efeitos ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setCursor(0) }, [query])

  // Scroll item ativo para view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  // ── Teclado ───────────────────────────────────────────────────────────────

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[cursor]
      if (cmd) { cmd.action(); onClose() }
    }
  }, [filtered, cursor, onClose])

  // ── Executar comando ──────────────────────────────────────────────────────

  const execute = useCallback((cmd) => {
    cmd.action()
    // só fecha se a action não fechou (ex: toggle dark mode fecha ele mesmo)
    if (cmd.id !== 'toggle-dark' && cmd.id !== 'sair') onClose()
  }, [onClose])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Painel */}
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1,    y: 0   }}
            exit={{    opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="
              fixed left-1/2 top-[18%] z-[301]
              -translate-x-1/2
              w-full max-w-xl
              bg-white/95 dark:bg-slate-900/95
              backdrop-blur-2xl
              rounded-2xl
              border border-slate-200/70 dark:border-slate-700/60
              shadow-2xl shadow-slate-900/20
              overflow-hidden
            "
            onKeyDown={onKeyDown}
          >
            {/* Campo de busca */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar páginas, ações..."
                className="
                  flex-1 bg-transparent outline-none
                  text-sm text-slate-800 dark:text-slate-100
                  placeholder:text-slate-400
                "
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                ESC
              </kbd>
            </div>

            {/* Lista */}
            <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain py-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                  <Zap size={22} strokeWidth={1.5} />
                  <span className="text-sm">Nenhum resultado</span>
                </div>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {group}
                    </p>
                    {items.map(cmd => {
                      const Icon = cmd.icon
                      const active = cmd._idx === cursor
                      return (
                        <button
                          key={cmd.id}
                          data-idx={cmd._idx}
                          onMouseEnter={() => setCursor(cmd._idx)}
                          onClick={() => execute(cmd)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2.5 text-left
                            transition-colors duration-75
                            ${active
                              ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }
                          `}
                        >
                          <span className={`
                            flex-shrink-0 p-1.5 rounded-lg
                            ${active
                              ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }
                          `}>
                            <Icon size={14} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium leading-tight truncate">
                              {cmd.label}
                            </span>
                            {cmd.desc && (
                              <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {cmd.desc}
                              </span>
                            )}
                          </span>
                          {active && <ArrowRight size={13} className="flex-shrink-0 opacity-50" />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <kbd className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <kbd className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">↵</kbd>
                executar
              </span>
              <span className="ml-auto text-[10px] text-slate-300 dark:text-slate-600">Conflui</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
