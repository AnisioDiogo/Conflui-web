import { createContext, useContext, useEffect, useState } from 'react'

// Valor padrão evita TypeError se useTheme() for chamado fora do Provider
const ThemeContext = createContext({
  dark: false,
  toggleTheme: () => {},
})

function lerTheme() {
  try {
    return localStorage.getItem('theme') === 'dark'
  } catch {
    return false
  }
}

function salvarTheme(dark) {
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  } catch { /* silent — localStorage indisponível */ }
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(lerTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    salvarTheme(dark)
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
