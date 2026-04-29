import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import {
  doc, setDoc, getDoc,
  collection, addDoc, onSnapshot,
  updateDoc, deleteDoc, query, orderBy
} from 'firebase/firestore'

export default function Concurso() {
  const { usuario } = useAuth()
  const [nome, setNome] = useState('')
  const [banca, setBanca] = useState('')
  const [dataProva, setDataProva] = useState('')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [disciplinas, setDisciplinas] = useState([])
  const [discNome, setDiscNome] = useState('')
  const [discHoras, setDiscHoras] = useState('')

  const docRef = doc(db, 'usuarios', usuario.uid, 'concurso', 'dados')
  const colecao = collection(db, 'usuarios', usuario.uid, 'disciplinas')

  // Carregar dados salvos
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

    const q = query(colecao, orderBy('criadoEm'))
    const unsub = onSnapshot(q, snap => {
      setDisciplinas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  async function salvar() {
    setSalvando(true)
    await setDoc(docRef, { nome, banca, dataProva, notas })
    setSalvando(false)
    alert('Salvo com sucesso!')
  }

  async function addDisciplina() {
    if (!discNome.trim()) return
    await addDoc(colecao, {
      nome: discNome,
      metaHoras: parseInt(discHoras) || 0,
      horasFeitas: 0,
      criadoEm: Date.now()
    })
    setDiscNome('')
    setDiscHoras('')
  }

  async function addHora(disc) {
    const nova = Math.min(disc.horasFeitas + 1, disc.metaHoras || 999)
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'disciplinas', disc.id), {
      horasFeitas: nova
    })
  }

  async function removeHora(disc) {
    const nova = Math.max(disc.horasFeitas - 1, 0)
    await updateDoc(doc(db, 'usuarios', usuario.uid, 'disciplinas', disc.id), {
      horasFeitas: nova
    })
  }

  async function deletarDisc(id) {
    await deleteDoc(doc(db, 'usuarios', usuario.uid, 'disciplinas', id))
  }

  function diasRestantes() {
    if (!dataProva) return null
    const diff = Math.ceil((new Date(dataProva + 'T00:00:00') - new Date()) / 86400000)
    return diff
  }

  const dias = diasRestantes()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-xl font-medium text-gray-800 mb-1">Concurso</h1>
        <p className="text-sm text-gray-400 mb-6">Acompanhe sua preparação</p>

        {/* Contagem regressiva */}
        {dias !== null && (
          <div className={`rounded-2xl p-5 mb-6 text-center ${dias > 30 ? 'bg-blue-50' : dias > 7 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <p className={`text-4xl font-medium mb-1 ${dias > 30 ? 'text-blue-600' : dias > 7 ? 'text-amber-600' : 'text-red-500'}`}>
              {dias > 0 ? dias : 0}
            </p>
            <p className={`text-sm ${dias > 30 ? 'text-blue-400' : dias > 7 ? 'text-amber-400' : 'text-red-400'}`}>
              {dias > 0 ? 'dias restantes para a prova' : 'A prova já passou!'}
            </p>
            {nome && <p className="text-xs text-gray-400 mt-1">{nome}{banca ? ` · ${banca}` : ''}</p>}
          </div>
        )}

        {/* Dados do concurso */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Dados do concurso</p>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Nome do concurso"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Banca (ex: CESPE)"
              value={banca}
              onChange={e => setBanca(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Data da prova</p>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                value={dataProva}
                onChange={e => setDataProva(e.target.value)}
              />
            </div>
          </div>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 resize-none"
            rows={3}
            placeholder="Anotações, cronograma, materiais..."
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
          <button
            onClick={salvar}
            disabled={salvando}
            className="mt-3 bg-blue-50 text-blue-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-100 transition"
          >
            {salvando ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>

        {/* Disciplinas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Disciplinas</p>
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Ex: Português, Matemática..."
              value={discNome}
              onChange={e => setDiscNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDisciplina()}
            />
            <input
              className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
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
            <p className="text-center text-gray-300 text-sm py-4">Nenhuma disciplina adicionada</p>
          )}

          {disciplinas.map((disc, i) => {
            const pct = disc.metaHoras ? Math.round(disc.horasFeitas / disc.metaHoras * 100) : 0
            return (
              <div key={disc.id} className={`py-3 ${i < disciplinas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="flex-1 text-sm text-gray-700">{disc.nome}</p>
                  <button
                    onClick={() => removeHora(disc)}
                    className="w-7 h-7 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 text-sm transition"
                  >
                    −
                  </button>
                  <span className="text-sm text-gray-600 w-16 text-center">
                    {disc.horasFeitas}{disc.metaHoras ? `/${disc.metaHoras}h` : 'h'}
                  </span>
                  <button
                    onClick={() => addHora(disc)}
                    className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm transition"
                  >
                    +
                  </button>
                  <button
                    onClick={() => deletarDisc(disc.id)}
                    className="text-gray-200 hover:text-red-400 text-xs transition ml-1"
                  >
                    ✕
                  </button>
                </div>
                {disc.metaHoras > 0 && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: pct + '%',
                        background: pct >= 100 ? '#22c55e' : '#60a5fa'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}