import { Component } from 'react'

/**
 * ErrorBoundary — captura qualquer erro de renderização React
 * e exibe uma tela de fallback amigável em vez de tela preta.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { temErro: false, erro: null }
  }

  static getDerivedStateFromError(erro) {
    return { temErro: true, erro }
  }

  componentDidCatch(erro, info) {
    console.error('[ErrorBoundary] Erro capturado:', erro)
    console.error('[ErrorBoundary] Stack de componentes:', info.componentStack)
  }

  recarregar() {
    this.setState({ temErro: false, erro: null })
    window.location.reload()
  }

  render() {
    if (!this.state.temErro) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</p>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Algo deu errado
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
            Um componente apresentou um erro inesperado. Recarregue a página para continuar.
          </p>

          {/* Detalhes técnicos (dev mode) */}
          {import.meta.env.DEV && this.state.erro && (
            <details
              style={{
                marginBottom: '20px',
                textAlign: 'left',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '12px',
              }}
            >
              <summary
                style={{ fontSize: '12px', color: '#e11d48', cursor: 'pointer', fontWeight: '600' }}
              >
                Detalhes do erro (dev)
              </summary>
              <pre
                style={{
                  fontSize: '11px',
                  color: '#9f1239',
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.erro.message}
              </pre>
            </details>
          )}

          <button
            onClick={() => this.recarregar()}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Recarregar página
          </button>
        </div>
      </div>
    )
  }
}
