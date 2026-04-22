import { BrowserRouter, Routes, Route,Navigate } from 'react-router-dom'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Rotina from './pages/Rotina'
import Finaceiro from './pages/Finaceiro'
import Estudos from './pages/Estudos'
import Concurso from './pages/Concurso'
import Metas from './pages/Metas'

function Privada({children}) {
  const { usuario } = useAuth()
  if (!usuario) {
    return <Navigate to="/" />
  }
  return children
}


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/dashboard' element={<Privada><Dashboard /></Privada>} />
        <Route path='/rotina' element={<Privada><Rotina /></Privada>} />
        <Route path='/financeiro' element={<Privada><Finaceiro /></Privada>} />
        <Route path='/estudos' element={<Privada><Estudos /></Privada>} />
        <Route path='/concurso' element={<Privada><Concurso /></Privada>} />
        <Route path='/metas' element={<Privada><Metas /></Privada>} />
      </Routes>
      </BrowserRouter>
  )
}

export default App