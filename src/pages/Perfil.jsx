import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { auth, db } from '../firebase'
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { Camera, Loader, Check, Mail, Phone, User, Lock, Shield } from 'lucide-react'

export default function Perfil() {
  const { usuario, foto, atualizarFoto } = useAuth()

  const [nome, setNome]         = useState(usuario?.displayName || '')
  const [telefone, setTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [upFoto, setUpFoto]     = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)
  const [sucesso, setSucesso]   = useState('')

  const isGoogleUser = usuario?.providerData?.[0]?.providerId === 'google.com'

  // Carrega dados extras do Firestore (telefone)
  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'usuarios', usuario.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setNome(d.nome || usuario?.displayName || '')
        setTelefone(d.telefone || '')
      }
    })
  }, [usuario])

  async function salvarPerfil() {
    setSalvando(true)
    try {
      await updateProfile(auth.currentUser, { displayName: nome })
      await updateDoc(doc(db, 'usuarios', usuario.uid), {
        nome,
        telefone,
        atualizadoEm: Date.now()
      })
      setSucesso('Perfil atualizado com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSalvando(false)
    }
  }

  async function trocarFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUpFoto(true)
    await atualizarFoto(file)
    setUpFoto(false)
  }

  async function resetSenha() {
    await sendPasswordResetEmail(auth, usuario.email)
    setResetEnviado(true)
  }

  const inicial = nome?.charAt(0)?.toUpperCase() || '?'

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-bold text-slate-800 mb-6">Meu Perfil</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            {foto ? (
              <img
                src={foto}
                alt={nome}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center border-4 border-white shadow-md">
                <span className="text-white text-3xl font-bold leading-none">{inicial}</span>
              </div>
            )}

            {/* Botão trocar foto */}
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 transition">
              {upFoto
                ? <Loader size={13} className="animate-spin text-blue-500" />
                : <Camera size={13} className="text-slate-500" />
              }
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={trocarFoto}
                disabled={upFoto}
              />
            </label>
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-700">{nome || 'Usuário'}</p>
          <p className="text-xs text-slate-400">{usuario?.email}</p>

          {isGoogleUser && (
            <span className="mt-2 text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-medium">
              Conta Google
            </span>
          )}
        </div>

        {/* Sucesso */}
        {sucesso && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-4 py-3 mb-4 text-sm">
            <Check size={14} />
            {sucesso}
          </div>
        )}

        {/* Dados da conta */}
        <div className="card p-5 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Dados da conta</p>

          <div className="space-y-4">

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <User size={12} /> Nome
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <Mail size={12} /> Email
              </label>
              <input
                className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 outline-none cursor-not-allowed"
                value={usuario?.email || ''}
                readOnly
                disabled
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <Phone size={12} /> Telefone
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                type="tel"
              />
            </div>

          </div>

          <button
            onClick={salvarPerfil}
            disabled={salvando}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {/* Segurança */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
            <Shield size={12} /> Segurança
          </p>

          {isGoogleUser ? (
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500">
              <p className="font-medium text-slate-600 mb-1">Conta vinculada ao Google</p>
              <p className="text-xs text-slate-400">
                Sua senha é gerenciada pelo Google. Para alterar, acesse as configurações da sua conta Google.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 mb-3">
                Enviaremos um link para <strong>{usuario?.email}</strong> para você redefinir sua senha.
              </p>
              {resetEnviado ? (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-4 py-3 text-sm">
                  <Check size={14} />
                  Email enviado! Verifique sua caixa de entrada.
                </div>
              ) : (
                <button
                  onClick={resetSenha}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-100 bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-2.5 font-medium transition"
                >
                  <Lock size={13} />
                  Enviar link de redefinição de senha
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
