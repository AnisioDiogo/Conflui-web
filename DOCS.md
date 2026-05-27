# Documentação — Meu App Vida

Guia completo para entender, manter e expandir o projeto.
Escrito para quem está aprendendo.

---

## 1. O que é esse projeto?

Um app web pessoal para organizar sua vida em um só lugar:

| Módulo     | O que faz                                              |
|------------|--------------------------------------------------------|
| Rotina     | Tarefas diárias por turno (manhã/tarde/noite) com calendário |
| Financeiro | Lançamentos de entradas e saídas por mês               |
| Estudos    | Lista de materiais para estudar com prioridade         |
| Metas      | Objetivos com progresso de depósitos financeiros       |
| Concurso   | Contagem regressiva e horas por disciplina             |
| Assistente | IA que entende linguagem natural e salva dados         |

---

## 2. Tecnologias usadas

```
React         — biblioteca para construir a interface
Vite          — ferramenta que roda o projeto no navegador
Tailwind CSS  — classes prontas de estilo (sem escrever CSS na mão)
Firebase Auth — login com Google e email/senha
Firestore     — banco de dados em nuvem em tempo real
Firebase Storage — armazenamento de fotos de perfil
Gemini API    — inteligência artificial que interpreta texto/voz
Lucide React  — ícones modernos prontos para usar
```

---

## 3. Estrutura de pastas explicada

```
meu-app/
│
├── src/                        ← Todo o código do app fica aqui
│   │
│   ├── main.jsx                ← Ponto de entrada (onde tudo começa)
│   ├── App.jsx                 ← Rotas: qual página aparece em cada URL
│   ├── App.css                 ← (não usado ativamente, pode ignorar)
│   ├── index.css               ← Estilos globais e sistema de design
│   ├── firebase.js             ← Configuração e exportação do Firebase
│   │
│   ├── context/
│   │   └── AuthContext.jsx     ← Gerencia o usuário logado em todo o app
│   │
│   ├── pages/                  ← Uma página = um arquivo
│   │   ├── Login.jsx           ← Tela de entrada (Google ou email/senha)
│   │   ├── Dashboard.jsx       ← Tela inicial com resumo geral
│   │   ├── Rotina.jsx          ← Tarefas do dia com calendário
│   │   ├── Finaceiro.jsx       ← (typo no nome) Controle financeiro
│   │   ├── Estudos.jsx         ← Lista de materiais de estudo
│   │   ├── Metas.jsx           ← Metas com depósitos e progresso
│   │   └── Concurso.jsx        ← Preparação para concurso público
│   │
│   └── components/             ← Partes reutilizáveis da interface
│       ├── Navbar.jsx          ← Barra de navegação (aparece em todas as páginas)
│       └── Assistente.jsx      ← Widget de IA com microfone
│
├── public/                     ← Arquivos estáticos (favicon, ícones SVG)
├── index.html                  ← HTML base (raramente precisa mexer)
├── vite.config.js              ← Configuração do Vite
├── package.json                ← Lista de dependências e scripts
└── .env                        ← Chaves secretas (não enviar ao GitHub!)
```

---

## 4. Como o React funciona aqui

### Conceito central: componentes

Cada arquivo `.jsx` é um **componente** — um bloco de HTML + lógica.
Você compõe o app juntando componentes:

```
App.jsx
  └── Dashboard.jsx
        ├── Navbar.jsx        ← componente filho
        └── Assistente.jsx    ← componente filho
```

### Estado (useState)

Estado é uma variável que, quando muda, atualiza a tela automaticamente.

```jsx
// Exemplo real do projeto
const [tarefas, setTarefas] = useState([])  // começa vazio

// Quando o Firestore envia dados novos:
setTarefas([...novaLista])  // React redesenha a tela automaticamente
```

**Regra:** nunca altere o estado diretamente (`tarefas.push(x)` não funciona).
Sempre use o setter: `setTarefas(novaLista)`.

### Efeitos (useEffect)

Código que roda quando o componente aparece na tela (ou quando algo muda).

```jsx
// Exemplo real: escutar o banco de dados quando a página abre
useEffect(() => {
  const unsub = onSnapshot(colecao, (snap) => {
    setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
  return unsub  // ← para de escutar quando a página fecha (limpeza)
}, [])          // ← [] significa "roda só uma vez ao abrir"
```

### Context (useAuth)

O `AuthContext.jsx` é um "estado global" — qualquer componente pode
saber quem está logado sem precisar passar por props.

```jsx
// Em qualquer componente:
const { usuario, foto } = useAuth()
console.log(usuario.displayName)  // "João Silva"
console.log(usuario.uid)          // "abc123xyz"
```

### Rotas (React Router)

O `App.jsx` define qual página aparece em cada URL:

```jsx
<Route path='/dashboard'  element={<Privada><Dashboard /></Privada>} />
<Route path='/financeiro' element={<Privada><Finaceiro /></Privada>} />
```

O componente `<Privada>` verifica se o usuário está logado.
Se não estiver, redireciona para a tela de login.

---

## 5. Como o Firebase está conectado

### Configuração (`firebase.js`)

```js
import { initializeApp } from 'firebase/app'
import { getAuth }       from 'firebase/auth'
import { getFirestore }  from 'firebase/firestore'
import { getStorage }    from 'firebase/storage'

const app = initializeApp({ /* credenciais do projeto */ })

export const auth     = getAuth(app)      // autenticação
export const db       = getFirestore(app) // banco de dados
export const storage  = getStorage(app)   // arquivos/fotos
```

### Estrutura do banco de dados (Firestore)

Cada usuário tem seus próprios dados isolados:

```
usuarios/
  {uid do usuário}/                ← documento do usuário (nome, email, foto)
    rotina/
      {id}/  { texto, turno, feito, data, criadoEm }
    financeiro/
      {id}/  { desc, valor, tipo, cat, mes, criadoEm }
    estudos/
      {id}/  { titulo, tipo, prioridade, feito, criadoEm }
    metas/
      {id}/  { titulo, area, valorAlvo, totalDepositado, feito, criadoEm }
        depositos/
          {id}/  { valor, nota, criadoEm }
    concurso/
      dados/  { nome, banca, dataProva, notas }

disciplinas/  ← (coleção separada, mesmo nível que usuarios)
  {id}/  { nome, metaHoras, horasFeitas, criadoEm }
```

### Ler dados em tempo real

```jsx
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'

const q = query(colecao, orderBy('criadoEm', 'desc'))

const parar = onSnapshot(q, (snap) => {
  const dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  setMinhosState(dados)  // atualiza a tela instantaneamente
})

// Quando o componente fechar, para de escutar:
return parar
```

### Escrever dados

```jsx
import { addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'

// Criar
await addDoc(colecao, { texto: 'Acordar cedo', feito: false })

// Atualizar
await updateDoc(doc(db, 'usuarios', uid, 'rotina', id), { feito: true })

// Deletar
await deleteDoc(doc(db, 'usuarios', uid, 'rotina', id))
```

---

## 6. Sistema de design — como alterar o visual

### Paleta de cores do projeto

| Uso                  | Cor Tailwind         | Exemplo visual    |
|----------------------|----------------------|-------------------|
| Fundo das páginas    | `bg-slate-50`        | cinza muito suave |
| Cards brancos        | classe `.card`       | branco com sombra |
| Texto principal      | `text-slate-800`     | quase preto       |
| Texto secundário     | `text-slate-400`     | cinza médio       |
| Primário (azul)      | `text-blue-600`      | azul médio        |
| Sucesso (verde)      | `text-emerald-600`   | verde             |
| Perigo (vermelho)    | `text-rose-500`      | vermelho suave    |
| Alerta (amarelo)     | `text-amber-600`     | âmbar             |

### Classes utilitárias definidas em `index.css`

```css
.card          → card branco com sombra suave
.input-base    → input com foco azul padronizado
.section-label → rótulo de seção em maiúsculas
.btn-primary   → botão azul principal
.btn-ghost     → botão cinza secundário
.page-enter    → animação de entrada da página
```

**Exemplo de uso:**
```jsx
<div className="card p-5 mb-4">
  <p className="section-label">Minhas tarefas</p>
  <input className="input-base" />
  <button className="btn-primary mt-3">Salvar</button>
</div>
```

### Como mudar a cor primária do app

Procure `blue-600` em qualquer arquivo e troque por outra cor do Tailwind.
Exemplos: `purple-600`, `indigo-600`, `teal-600`.

### Como mudar o fundo das páginas

Em cada página, troque `bg-slate-50` por outra cor:
```jsx
<div className="min-h-screen bg-slate-50">   // atual
<div className="min-h-screen bg-zinc-50">    // alternativa quente
<div className="min-h-screen bg-gray-100">   // alternativa neutra
```

---

## 7. Como adicionar uma nova funcionalidade

### Passo a passo completo: exemplo "Sono"

Vamos criar uma página para registrar horas de sono.

---

**Passo 1 — Criar o arquivo da página**

Crie `src/pages/Sono.jsx`:

```jsx
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'

export default function Sono() {
  const { usuario } = useAuth()
  const [registros, setRegistros] = useState([])
  const [horas, setHoras] = useState('')

  const colecao = collection(db, 'usuarios', usuario.uid, 'sono')

  useEffect(() => {
    const q = query(colecao, orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap =>
      setRegistros(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  async function registrar() {
    const h = parseFloat(horas)
    if (isNaN(h) || h <= 0) return
    await addDoc(colecao, { horas: h, criadoEm: Date.now() })
    setHoras('')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Sono</h1>
        <div className="card p-4 mb-4">
          <input
            className="input-base mb-2"
            placeholder="Quantas horas dormiu?"
            value={horas}
            onChange={e => setHoras(e.target.value)}
          />
          <button className="btn-primary w-full" onClick={registrar}>
            Registrar
          </button>
        </div>
        {registros.map(r => (
          <div key={r.id} className="card p-3 mb-2">
            <p className="text-sm text-slate-700">{r.horas}h</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

**Passo 2 — Adicionar a rota em `App.jsx`**

```jsx
import Sono from './pages/Sono'

// Dentro de <Routes>:
<Route path='/sono' element={<Privada><Sono /></Privada>} />
```

---

**Passo 3 — Adicionar ao menu em `Navbar.jsx`**

```jsx
import { Moon } from 'lucide-react'

const abas = [
  // ... abas existentes ...
  { nome: 'Sono', path: '/sono', icon: Moon },
]
```

---

**Passo 4 — Testar**

```bash
npm run dev
```

Acesse `http://localhost:5173/sono`.

---

## 8. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```
VITE_GEMINI_KEY=sua_chave_aqui
```

**Regras importantes:**
- Variáveis VITE devem começar com `VITE_` para funcionar no frontend
- Acesse no código com `import.meta.env.VITE_GEMINI_KEY`
- **Nunca envie o `.env` ao GitHub** — adicione ao `.gitignore`
- Para deploy na Vercel: adicione as variáveis em Settings → Environment Variables

---

## 9. Scripts disponíveis

```bash
npm run dev      # Inicia o servidor local (http://localhost:5173)
npm run build    # Gera os arquivos para publicar (pasta /dist)
npm run preview  # Pré-visualiza o build antes de publicar
npm run lint     # Verifica erros no código
```

---

## 10. Como publicar na Vercel

1. Faça o push do projeto para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente (Settings → Environment Variables):
   - `VITE_GEMINI_KEY` = sua chave da Gemini API
4. Clique em **Deploy**
5. A Vercel roda `npm run build` automaticamente e publica

A cada novo `git push`, a Vercel atualiza o app automaticamente.

---

## 11. Fluxo completo de um dado

Como uma tarefa de rotina percorre o sistema:

```
Usuário digita "Acordar às 7h"
         ↓
Assistente.jsx captura o texto
         ↓
Gemini API interpreta → { tipo: "rotina", dados: { texto: "Acordar", turno: "Manhã" } }
         ↓
confirmar() chama addDoc() no Firestore
         ↓
Firestore salva em: usuarios/{uid}/rotina/{novoId}
         ↓
onSnapshot() em Rotina.jsx detecta a mudança
         ↓
setTarefas([...]) atualiza o estado
         ↓
React redesenha a lista na tela
         ↓
Usuário vê a nova tarefa instantaneamente
```

---

## 12. Perguntas frequentes

**P: Por que os dados somem se o usuário trocar de conta Google?**
R: Cada usuário tem um `uid` único. Os dados ficam em `usuarios/{uid}/...`,
então cada conta tem seus próprios dados separados.

**P: Como funcionam as tarefas recorrentes?**
R: Quando o assistente detecta recorrência (ex: "todo dia"), ele cria
uma tarefa por dia nos próximos 30 dias via `writeBatch`. Aparece
normalmente no calendário da Rotina.

**P: O app funciona offline?**
R: Parcialmente. O Firestore tem cache local, então dados já carregados
ficam disponíveis. Mas novos dados não sincronizam sem internet.

**P: Como fazer backup dos dados?**
R: Os dados ficam automaticamente no Firestore (Firebase). Para exportar,
use o Firebase Console → Firestore → Exportar dados.

**P: Como testar localmente sem internet?**
R: Não é possível com Firestore em produção. Para testes offline, seria
necessário configurar o Firebase Emulator Suite (avançado).
