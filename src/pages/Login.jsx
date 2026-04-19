import {auth, provider} from '../firebase'
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate()

    async function entrarComGoogle() {
        try {
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (error) {
            console.error('Erro no login', error);
    }
}
    return (
     <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-medium text-gray-800 mb-2">Meu App Vida</h1>
        <p className="text-gray-400 text-sm mb-8">Sua rotina, finanças e estudos em um só lugar</p>
        <button
          onClick={entrarComGoogle}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
        >
          <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google" />
          Entrar com Google
        </button>
      </div>
      <p className="text-xs text-gray-300 mt-6">Seus dados ficam salvos na sua conta</p>
    </div>
  )
}
