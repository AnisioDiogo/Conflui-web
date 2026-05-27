import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ModulosProvider } from './context/ModulosContext'
import { ToastProvider } from './context/ToastContext'

// Páginas
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Rotina from './pages/Rotina'
import Finaceiro from './pages/Finaceiro'
import Estudos from './pages/Estudos'
import Concurso from './pages/Concurso'
import Metas from './pages/Metas'
import Perfil from './pages/Perfil'
import Configuracoes from './pages/Configuracoes'
import Vagas from './pages/Vagas'
import Projetos from './pages/Projetos'

// Componentes globais
import ChatGlobal from './components/ChatGlobal'
import CommandPalette, { useCommandPalette } from './components/command/CommandPalette'

// PWA
import ConnectivityBanner from './pwa/connectivity/ConnectivityBanner'
import InstallBanner from './pwa/install/InstallBanner'
import UpdateToast from './pwa/updates/UpdateToast'

// ── Rota privada ──────────────────────────────────────────────────────────────

function Privada({ children }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/" />
  return children
}

// ── AppInner — dentro do BrowserRouter para usar useNavigate ─────────────────

function AppInner() {
  const { open, setOpen } = useCommandPalette()

  return (
    <>
      {/* ── Rotas ──────────────────────────────────────────────────────────── */}
      <Routes>
        <Route path='/'              element={<Login />} />
        <Route path='/dashboard'     element={<Privada><Dashboard /></Privada>} />
        <Route path='/rotina'        element={<Privada><Rotina /></Privada>} />
        <Route path='/financeiro'    element={<Privada><Finaceiro /></Privada>} />
        <Route path='/estudos'       element={<Privada><Estudos /></Privada>} />
        <Route path='/concurso'      element={<Privada><Concurso /></Privada>} />
        <Route path='/metas'         element={<Privada><Metas /></Privada>} />
        <Route path='/perfil'        element={<Privada><Perfil /></Privada>} />
        <Route path='/configuracoes' element={<Privada><Configuracoes /></Privada>} />
        <Route path='/vagas'         element={<Privada><Vagas /></Privada>} />
        <Route path='/projetos'      element={<Privada><Projetos /></Privada>} />
      </Routes>

      {/* ── Globais de UX ──────────────────────────────────────────────────── */}

      {/* IA Chat (auto-gerenciado: retorna null sem usuário) */}
      <ChatGlobal />

      {/* Command Palette Ctrl+K */}
      <CommandPalette open={open} onClose={() => setOpen(false)} />

      {/* ── PWA ────────────────────────────────────────────────────────────── */}

      {/* Banner offline/online no topo */}
      <ConnectivityBanner />

      {/* Banner de instalação na base */}
      <InstallBanner />

      {/* Toast de nova versão disponível */}
      <UpdateToast />
    </>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <ModulosProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppInner />
          </BrowserRouter>
        </ToastProvider>
      </ModulosProvider>
    </ThemeProvider>
  )
}
