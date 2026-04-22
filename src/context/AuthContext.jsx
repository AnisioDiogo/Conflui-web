import { CreateContext, useState, useContext, useEffect} from "react"
import { createContext } from 'react';
import {auth} from '../firebase'
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext({})

export function AuthProvider({children}) {
    const [usuario, setUser] = useState(null)
    const [carregando, setCarregando] = useState(true)
    
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setCarregando(false)
        })

        return unsub
    }, [])

    return (
        <AuthContext.Provider value={{ usuario, carregando }}>
            {! carregando && children}
        </AuthContext.Provider>
    )
}
export function useAuth() {
    return useContext(AuthContext)
    
}