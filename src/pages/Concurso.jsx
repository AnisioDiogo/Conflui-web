import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { db, storage } from '../firebase'
import {
  doc, setDoc, getDoc,
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, query, orderBy
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { Upload, Trash2, ExternalLink, FileText, Image, Film, Paperclip, Pencil, Check } from 'lucide-react'

function iconeArquivo(tipo) {
  if (!tipo) return <Paperclip size={14} className="text-slate-400" />
  if (tipo.startsWith('image/')) return <Image size={14} className="text-blue-400" />
  if (tipo.startsWith('video/')) return <Film size={14} className="text-purple-400" />
  if (tipo === 'application/pdf') return <FileText size={14} className="text-red-400" />
  return <Paperclip size={14} className="text-slate-400" />
}

export default function Concurso() {
  const { usuario } = useAuth()
  const [nome, setNome] = useState('')
  const [banca, setBanca] = useState('')
  const [dataProva, setDataProva] = useState('')
  const [notas, setNotas] = useState('')
  const [editandoNotas, setEditandoNotas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [disciplinas, setDisciplinas] = useState([])
  const [discNome, setDiscNome] = useState('')
  const [discHoras, setDiscHoras] = useState('')
  const [arquivos, setArquivos] = useState([])
  const [uploadando, setUploadando] = useState(false)
  const fileInputRef = useRef(null)

  const docRef  = doc(db, 'usuarios', usuario.uid, 'concurso', 'dados')
  const colDisc = collection(db, 'usuarios', usuario.uid, 'disciplinas')
  const colArq  = collection(db, 'usuarios', usuario.uid, 'concurso_arquivos')

  useEffect(() => {
    getDoc(docRef).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setNome(d.nome || '')
        setBanca(d.banca || '')
        setDataProva(d.dataProva || '')
        setNotas(d.notas || '')
      }
    })

    const qDisc = query(colDisc, orderBy('criadoEm'))
    const unsubDisc = onSnapshot(qDisc, snap =>
      setDisciplinas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    const qArq = query(colArq, orderBy('criadoEm', 'desc'))
    const unsubArq = onSnapshot(qArq, snap =>
      setArquivos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    return () => { unsubDisc(); unsubArq() }
  }, [])

  async function salvar() {
    setSalvando(true)
    await setDoc(docRef, { nome, banca, dataProva, notas })
    setSalvando(false)
  }

  async function salvarNotas() {
    await setDoc(docRef, { nome, banca, dataProva, notas }, { merge: true })
    setEditandoNotas(false)
  }

  async function addDisciplina() {
    if (!discNome.trim()) return
    await addDoc(colDisc, {
      nome: discNome,
      metaHoras: parseInt(discHoras) || 0,
      horasFeitas: 0,
      criadoEm: Date.now()
    })
    setDiscNome(''); setDiscHoras('')
  }

  async function addHora(disc) {
    const nova = Math.min(disc.horasFeitas + 1, disc.metaHoras || 999)
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'disciplinas', disc.id), { horasFeitas: nova })
  }

  async function removeHora(disc) {
    const nova = Math.max(disc.horasFeitas - 1, 0)
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'disciplinas', disc.id), { horasFeitas: nova })
  }

  async function deletarDisc(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'disciplinas', id))
  }

  async function uploadArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadando(true)
    try {
      const storageRef = ref(storage, `concurso/${usuario.uid}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await addDoc(colArq, {
        nome: file.name,
        tipo: file.type,
        url,
        storagePath: storageRef.fullPath,
        criadoEm: Date.now()
      })
    } catch (err) {
      console.error('Upload falhou:', err)
    } finally {
      setUploadando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function deletarArquivo(arq) {
    try {
      await deleteObject(ref(storage, arq.storagePath))
    } catch { /* ignora se já foi deletado */ }
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'concurso_arquivos', arq.id))
  }

  function diasRestantes() {
    if (!dataProva) return null
    return Math.ceil((new Date(dataProva + 'T00:00:00') - new Date()) / 86400000)
  }

  const dias = diasRestantes()

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-bold text-slate-800 mb-1">Concurso</h1>
        <p className="text-sm text-slate-400 mb-6">Acompanhe sua preparação</p>

        {/* Contagem regressiva */}
        {dias !== null && (
          <div className={`rounded-2xl p-5 mb-6 text-center ${dias > 30 ? 'bg-blue-50' : dias > 7 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <p className={`text-4xl font-medium mb-1 ${dias > 30 ? 'text-blue-600' : dias > 7 ? 'text-amber-600' : 'text-red-500'}`}>
              {dias > 0 ? dias : 0}
            </p>
            <p className={`text-sm ${dias > 30 ? 'text-blue-400' : dias > 7 ? 'text-amber-400' : 'text-red-400'}`}>
              {dias > 0 ? 'dias restantes para a prova' : 'A prova já passou!'}
            </p>
            {nome && <p className="text-xs text-slate-400 mt-1">{nome}{banca ? ` · ${banca}` : ''}</p>}
          </div>
        )}

        {/* Dados do concurso */}
        <div className="card p-4 mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Dados do concurso</p>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Nome do concurso"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
            <input
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Banca (ex: CESPE)"
              value={banca}
              onChange={e => setBanca(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <p className="text-xs text-slate-400 mb-1">Data da prova</p>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={dataProva}
              onChange={e => setDataProva(e.target.value)}
            />
          </div>
          <button
            onClick={salvar}
            disabled={salvando}
            className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition"
          >
            {salvando ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>

        {/* Anotações editáveis */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">Anotações</p>
            {!editandoNotas ? (
              <button
                onClick={() => setEditandoNotas(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition"
              >
                <Pencil size={12} /> Editar
              </button>
            ) : (
              <button
                onClick={salvarNotas}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
              >
                <Check size={12} /> Salvar
              </button>
            )}
          </div>

          {editandoNotas ? (
            <textarea
              className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none ring-2 ring-blue-50"
              rows={5}
              placeholder="Cronograma, materiais, links, observações..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              autoFocus
            />
          ) : (
            <div
              onClick={() => setEditandoNotas(true)}
              className="min-h-[80px] cursor-text"
            >
              {notas ? (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{notas}</p>
              ) : (
                <p className="text-sm text-slate-300">Clique para adicionar anotações...</p>
              )}
            </div>
          )}
        </div>

        {/* Disciplinas */}
        <div className="card p-4 mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Disciplinas</p>
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Ex: Português, Matemática..."
              value={discNome}
              onChange={e => setDiscNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDisciplina()}
            />
            <input
              className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
              placeholder="Meta/h"
              type="number"
              value={discHoras}
              onChange={e => setDiscHoras(e.target.value)}
            />
            <button
              onClick={addDisciplina}
              className="bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition"
            >
              + Add
            </button>
          </div>

          {disciplinas.length === 0 && (
            <p className="text-center text-slate-300 text-sm py-4">Nenhuma disciplina adicionada</p>
          )}

          {disciplinas.map((disc, i) => {
            const pct = disc.metaHoras ? Math.round(disc.horasFeitas / disc.metaHoras * 100) : 0
            return (
              <div key={disc.id} className={`py-3 ${i < disciplinas.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="flex-1 text-sm text-slate-700">{disc.nome}</p>
                  <button onClick={() => removeHora(disc)} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:bg-gray-100 text-sm transition">−</button>
                  <span className="text-sm text-slate-600 w-16 text-center">
                    {disc.horasFeitas}{disc.metaHoras ? `/${disc.metaHoras}h` : 'h'}
                  </span>
                  <button onClick={() => addHora(disc)} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm transition">+</button>
                  <button onClick={() => deletarDisc(disc.id)} className="text-slate-200 hover:text-red-400 text-xs transition ml-1">✕</button>
                </div>
                {disc.metaHoras > 0 && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: pct + '%', background: pct >= 100 ? '#22c55e' : '#60a5fa' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Arquivos e comprovantes */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">Arquivos e Comprovantes</p>
            <label className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl cursor-pointer transition ${
              uploadando
                ? 'bg-slate-100 text-slate-400 pointer-events-none'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}>
              <Upload size={12} />
              {uploadando ? 'Enviando...' : 'Upload'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,video/*,.doc,.docx,.txt"
                className="hidden"
                onChange={uploadArquivo}
                disabled={uploadando}
              />
            </label>
          </div>

          <p className="text-xs text-slate-300 mb-3">
            Aceita PDF, imagens, vídeos, documentos
          </p>

          {arquivos.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-100 rounded-xl p-8 text-center cursor-pointer hover:border-blue-200 transition"
            >
              <Upload size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-300">Clique para fazer upload</p>
            </div>
          ) : (
            <div className="space-y-2">
              {arquivos.map(arq => (
                <div key={arq.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                  <div className="flex-shrink-0">
                    {iconeArquivo(arq.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{arq.nome}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(arq.criadoEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <a
                    href={arq.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:text-blue-700 transition flex-shrink-0"
                    title="Abrir arquivo"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => deletarArquivo(arq)}
                    className="text-slate-200 hover:text-red-400 transition flex-shrink-0"
                    title="Deletar arquivo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
