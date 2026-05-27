import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Camera, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function traduzirErro(code) {
  const mapa = {
    'auth/user-not-found':     'Usuário não encontrado.',
    'auth/wrong-password':     'Senha incorreta.',
    'auth/invalid-credential': 'Email ou senha incorretos.',
    'auth/email-already-in-use': 'Este email já está cadastrado.',
    'auth/weak-password':      'A senha deve ter pelo menos 6 caracteres.',
    'auth/invalid-email':      'Email inválido.',
    'auth/too-many-requests':  'Muitas tentativas. Tente mais tarde.',
  }
  return mapa[code] || 'Erro ao autenticar. Tente novamente.'
}

const recursos = [
  'Rotina diária por turno',
  'Controle financeiro completo',
  'Gestão de estudos',
  'Metas e concursos',
]

export default function Login() {
  const navigate = useNavigate()
  const { entrarComGoogle, entrarComEmail, cadastrarComEmail } = useAuth()

  const [aba, setAba] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const fotoRef = useRef()

  function trocarAba(nova) {
    setAba(nova)
    setErro('')
  }

  function selecionarFoto(e) {
    const f = e.target.files[0]
    if (!f) return
    setFotoFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setFotoPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  async function handleGoogle() {
    setErro('')
    setCarregando(true)
    try {
      await entrarComGoogle()
      navigate('/dashboard')
    } catch (e) {
      setErro('Não foi possível entrar com Google. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleEntrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await entrarComEmail(email, senha)
      navigate('/dashboard')
    } catch (e) {
      setErro(traduzirErro(e.code))
    } finally {
      setCarregando(false)
    }
  }

  async function handleCadastro(e) {
    e.preventDefault()
    if (!nome.trim()) { setErro('Digite seu nome.'); return }
    setErro('')
    setCarregando(true)
    try {
      await cadastrarComEmail(nome, email, senha, fotoFile)
      navigate('/dashboard')
    } catch (e) {
      setErro(traduzirErro(e.code))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Decoração de fundo */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-sm relative">

        {/* Logo acima do card */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-white text-3xl leading-none">✦</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Meu App Vida</h1>
          <p className="text-sm text-blue-300/70 mt-1">Rotina · Finanças · Estudos · Metas</p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'entrar',    label: 'Entrar' },
              { id: 'cadastrar', label: 'Criar conta' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => trocarAba(id)}
                className={`flex-1 py-4 text-sm font-medium transition-colors focus:outline-none ${
                  aba === id
                    ? 'text-blue-600 border-b-2 border-blue-500 -mb-px bg-blue-50/30'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* Botão Google */}
            <button
              onClick={handleGoogle}
              disabled={carregando}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-2xl py-3 px-4 text-sm font-medium text-gray-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            {/* Divisor */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-300 font-medium">ou</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Formulário */}
            <form onSubmit={aba === 'entrar' ? handleEntrar : handleCadastro} className="space-y-4">

              {/* Campos só no cadastro */}
              {aba === 'cadastrar' && (
                <>
                  {/* Avatar picker */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fotoRef.current?.click()}
                      className="relative group"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg ring-2 ring-blue-100 group-hover:ring-blue-300 transition-all">
                        {fotoPreview
                          ? <img src={fotoPreview} alt="prévia" className="w-full h-full object-cover" />
                          : <span className="text-3xl select-none">🙂</span>
                        }
                      </div>
                      <div className="absolute bottom-0.5 right-0.5 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow group-hover:bg-blue-600 transition-colors">
                        <Camera size={13} className="text-white" />
                      </div>
                    </button>
                    <p className="text-xs text-gray-400">Foto de perfil <span className="text-gray-300">(opcional)</span></p>
                    <input
                      ref={fotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={selecionarFoto}
                    />
                  </div>

                  {/* Nome */}
                  <Campo label="Nome completo" htmlFor="nome">
                    <input
                      id="nome"
                      type="text"
                      placeholder="Seu nome"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="input-base"
                      autoComplete="name"
                      required
                    />
                  </Campo>
                </>
              )}

              {/* Email */}
              <Campo label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-base"
                  autoComplete="email"
                  required
                />
              </Campo>

              {/* Senha */}
              <Campo label="Senha" htmlFor="senha">
                <div className="relative">
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className="input-base pr-10"
                    autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Campo>

              {/* Erro */}
              {erro && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {erro}
                </p>
              )}

              {/* Botão principal */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-3 text-sm font-semibold transition-all shadow-lg shadow-blue-200/50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {carregando && <Loader size={14} className="animate-spin" />}
                {aba === 'entrar' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>
          </div>

          {/* Recursos no rodapé do card */}
          <div className="px-6 pb-6 -mt-1">
            <div className="border-t border-gray-50 pt-4">
              <p className="text-xs text-gray-400 text-center mb-3">O que você encontra aqui</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                {recursos.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-blue-300/40 mt-5">
          Dados salvos com segurança · Privacidade total
        </p>
      </div>
    </div>
  )
}

function Campo({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
