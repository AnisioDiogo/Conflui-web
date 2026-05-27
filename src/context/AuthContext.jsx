import { createContext, useState, useContext, useEffect } from 'react'
import { auth, provider, db, storage } from '../firebase'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const AuthContext = createContext({})

async function _salvarPerfil(uid, dados) {
  await setDoc(doc(db, 'usuarios', uid), {
    ...dados,
    atualizadoEm: Date.now()
  }, { merge: true })
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  // Estado separado para foto — permite atualizar sem depender do objeto Firebase User
  const [fotoAtual, setFotoAtual] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user)
      setFotoAtual(user?.photoURL || null)
      if (user) {
        _salvarPerfil(user.uid, {
          nome: user.displayName || '',
          email: user.email || '',
          foto: user.photoURL || ''
        })
      }
      setCarregando(false)
    })
    return unsub
  }, [])

  async function entrarComGoogle() {
    const result = await signInWithPopup(auth, provider)
    setFotoAtual(result.user.photoURL)
    return result
  }

  async function entrarComEmail(email, senha) {
    return signInWithEmailAndPassword(auth, email, senha)
  }

  async function cadastrarComEmail(nome, email, senha, fotoFile) {
    const result = await createUserWithEmailAndPassword(auth, email, senha)
    const user = result.user

    let fotoURL = null
    if (fotoFile) {
      const storageRef = ref(storage, `fotos/${user.uid}`)
      await uploadBytes(storageRef, fotoFile)
      fotoURL = await getDownloadURL(storageRef)
    }

    await updateProfile(user, {
      displayName: nome,
      ...(fotoURL && { photoURL: fotoURL })
    })

    setFotoAtual(fotoURL)

    _salvarPerfil(user.uid, {
      nome,
      email: user.email,
      foto: fotoURL || ''
    })

    return result
  }

  async function atualizarFoto(fotoFile) {
    const user = auth.currentUser
    if (!user || !fotoFile) return
    const storageRef = ref(storage, `fotos/${user.uid}`)
    await uploadBytes(storageRef, fotoFile)
    const fotoURL = await getDownloadURL(storageRef)
    await updateProfile(user, { photoURL: fotoURL })
    setFotoAtual(fotoURL)
    _salvarPerfil(user.uid, {
      nome: user.displayName || '',
      email: user.email || '',
      foto: fotoURL
    })
  }

  // `foto` é a fonte de verdade para exibir o avatar em qualquer componente
  const foto = fotoAtual || usuario?.photoURL || null

  return (
    <AuthContext.Provider value={{
      usuario,
      carregando,
      foto,
      entrarComGoogle,
      entrarComEmail,
      cadastrarComEmail,
      atualizarFoto
    }}>
      {!carregando && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
