import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Rotina from './pages/Rotina'
import Finaceiro from './pages/Finaceiro'
import Estudos from './pages/Estudos'
import Concurso from './pages/Concurso'
import Metas from './pages/Metas'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/rotina' element={<Rotina />} />
        <Route path='/financeiro' element={<Finaceiro />} />
        <Route path='/estudos' element={<Estudos />} />
        <Route path='/concurso' element={<Concurso />} />
        <Route path='/metas' element={<Metas />} />
      </Routes>
      </BrowserRouter>
  )
}

export default App