import Layout from '../components/Layout'
import { useTheme } from '../context/ThemeContext'
import { useModulos, TODOS_MODULOS } from '../context/ModulosContext'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import {
  Sun, Moon, User, ChevronRight, Sparkles,
  LayoutDashboard,
} from 'lucide-react'

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ ativo, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        ativo ? 'bg-blue-500' : 'bg-slate-200'
      }`}
      role="switch"
      aria-checked={ativo}
    >
      <span
        className={`inline-block w-5 h-5 mt-0.5 ml-0.5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
          ativo ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Configuracoes() {
  const { dark, toggleTheme }          = useTheme()
  const { modulos, toggleModulo }      = useModulos()
  const { usuario }                    = useAuth()
  const primeiroNome = usuario?.displayName?.split(' ')[0] || 'você'

  const modulosAtivos   = TODOS_MODULOS.filter(m => !m.emBreve)
  const modulosEmBreve  = TODOS_MODULOS.filter(m => m.emBreve)

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        {/* Cabeçalho */}
        <div className="mb-7">
          <h1 className="text-xl font-bold text-slate-800">Configurações</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Personalize sua experiência no app
          </p>
        </div>

        {/* ── Seção: Módulos ativos ──────────────────────────────────────── */}
        <div className="card p-5 mb-4">
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Módulos
            </p>
            <p className="text-xs text-slate-400">
              Ative ou desative módulos para personalizar a sidebar
            </p>
          </div>

          <div className="space-y-1">
            {/* Dashboard — sempre ativo, não pode desligar */}
            <div className="flex items-center gap-3 py-2.5 px-2 rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard size={16} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">Início</p>
                <p className="text-xs text-slate-400">Painel principal do app</p>
              </div>
              <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                Sempre ativo
              </span>
            </div>

            <div className="border-t border-slate-50 my-1" />

            {modulosAtivos.map(modulo => (
              <div
                key={modulo.id}
                className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition"
              >
                <div className={`w-9 h-9 rounded-xl ${modulo.bgCor} flex items-center justify-center flex-shrink-0`}>
                  <modulo.icon size={16} className={modulo.cor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{modulo.label}</p>
                  <p className="text-xs text-slate-400 truncate">{modulo.desc}</p>
                </div>
                <Toggle
                  ativo={!!modulos[modulo.id]}
                  onChange={() => toggleModulo(modulo.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Seção: Em breve ───────────────────────────────────────────── */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} className="text-amber-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Em breve
            </p>
          </div>

          <div className="space-y-1">
            {modulosEmBreve.map(modulo => (
              <div
                key={modulo.id}
                className="flex items-center gap-3 py-2.5 px-2 rounded-xl opacity-60"
              >
                <div className={`w-9 h-9 rounded-xl ${modulo.bgCor} flex items-center justify-center flex-shrink-0`}>
                  <modulo.icon size={16} className={modulo.cor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{modulo.label}</p>
                  <p className="text-xs text-slate-400 truncate">{modulo.desc}</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full flex-shrink-0">
                  Em breve
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Seção: Aparência ──────────────────────────────────────────── */}
        <div className="card p-5 mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Aparência
          </p>

          <div className="flex items-center gap-3 py-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              dark ? 'bg-slate-700' : 'bg-amber-50'
            }`}>
              {dark
                ? <Moon size={16} className="text-slate-300" />
                : <Sun size={16} className="text-amber-400" />
              }
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">
                {dark ? 'Modo escuro' : 'Modo claro'}
              </p>
              <p className="text-xs text-slate-400">
                {dark ? 'Interface com fundo escuro' : 'Interface com fundo claro'}
              </p>
            </div>
            <Toggle ativo={dark} onChange={toggleTheme} />
          </div>
        </div>

        {/* ── Seção: Conta ──────────────────────────────────────────────── */}
        <div className="card overflow-hidden mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-5 pt-5 mb-3">
            Conta
          </p>

          <Link
            to="/perfil"
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition border-t border-slate-50"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">Meu perfil</p>
              <p className="text-xs text-slate-400 truncate">
                {usuario?.email || 'Ver e editar perfil'}
              </p>
            </div>
            <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
          </Link>
        </div>

        {/* Versão */}
        <p className="text-center text-xs text-slate-300">
          Conflui · v1.0 · {new Date().getFullYear()}
        </p>

      </div>
    </Layout>
  )
}
