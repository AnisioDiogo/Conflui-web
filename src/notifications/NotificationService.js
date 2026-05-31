/**
 * NotificationService — Arquitetura de notificações do Conflui
 *
 * ESTADO ATUAL: Preparação de arquitetura (P3)
 * Notificações locais via browser Notification API.
 * Estrutura pronta para integrar FCM (Firebase Cloud Messaging) futuramente.
 *
 * FLUXO DE IMPLEMENTAÇÃO FUTURA (FCM):
 * 1. Habilitar Cloud Messaging no Firebase Console
 * 2. Gerar VAPID key em Project Settings > Cloud Messaging
 * 3. Importar getMessaging, getToken, onMessage do firebase/messaging
 * 4. Configurar o SW para receber mensagens em background
 *
 * TIPOS DE NOTIFICAÇÕES PLANEJADAS:
 * - 'conta_vencendo'  : conta vence em X dias
 * - 'conta_vencida'   : conta venceu sem pagamento
 * - 'tarefa_diaria'   : checagem matinal da rotina
 * - 'meta_progresso'  : progresso de meta atualizado
 * - 'concurso_prova'  : prova se aproxima (30/7/3/1 dias)
 * - 'estudo_pendente' : material de estudo com data
 * - 'ia_insight'      : insight semanal da IA
 */

// ── Permissões ────────────────────────────────────────────────────────────────

/**
 * Solicita permissão para notificações do browser.
 * Retorna: 'granted' | 'denied' | 'default'
 */
export async function pedirPermissao() {
  if (!('Notification' in window)) return 'unavailable'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  const result = await Notification.requestPermission()
  return result
}

/**
 * Verifica se as notificações estão disponíveis e permitidas.
 */
export function notificacoesAtivas() {
  return 'Notification' in window && Notification.permission === 'granted'
}

// ── Notificação local ─────────────────────────────────────────────────────────

/**
 * Exibe uma notificação local imediata.
 *
 * @param {string} titulo
 * @param {object} opcoes  — { body, icon, tag, data, requireInteraction }
 */
export function notificarAgora(titulo, opcoes = {}) {
  if (!notificacoesAtivas()) return null

  return new Notification(titulo, {
    icon:   '/icons/icon.svg',
    badge:  '/icons/icon.svg',
    lang:   'pt-BR',
    silent: false,
    ...opcoes,
  })
}

// ── Lembretes agendados (via setTimeout) ─────────────────────────────────────

const _timers = new Map()

/**
 * Agenda uma notificação para daqui a X milissegundos.
 * Retorna um ID para cancelar com cancelarLembrete(id).
 *
 * Limitação: usa setTimeout, então só funciona enquanto o app estiver aberto.
 * Para notificações em background, será necessário FCM.
 */
export function agendarLembrete(id, titulo, opcoes = {}, delayMs) {
  cancelarLembrete(id) // cancela se já existia
  const timer = setTimeout(() => notificarAgora(titulo, opcoes), delayMs)
  _timers.set(id, timer)
  return id
}

export function cancelarLembrete(id) {
  if (_timers.has(id)) {
    clearTimeout(_timers.get(id))
    _timers.delete(id)
  }
}

export function cancelarTodosLembretes() {
  _timers.forEach(t => clearTimeout(t))
  _timers.clear()
}

// ── Helpers de negócio ────────────────────────────────────────────────────────

/**
 * Agenda lembretes para uma conta a vencer.
 *
 * @param {object} conta  — { id, desc, valor, dataVencimento }
 */
export function agendarLembreteConta(conta) {
  if (!conta.dataVencimento) return

  const venc     = new Date(conta.dataVencimento + 'T09:00:00')
  const agora    = new Date()
  const diasMs   = 24 * 60 * 60 * 1000
  const fmtValor = (conta.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const lembretes = [
    { dias: 7,  msg: `Vence em 7 dias (${fmtValor})` },
    { dias: 3,  msg: `Vence em 3 dias (${fmtValor})` },
    { dias: 1,  msg: `Vence amanhã! (${fmtValor})` },
    { dias: 0,  msg: `Vence hoje! (${fmtValor})` },
  ]

  lembretes.forEach(({ dias, msg }) => {
    const data  = new Date(venc.getTime() - dias * diasMs)
    const delay = data.getTime() - agora.getTime()
    if (delay > 0) {
      agendarLembrete(
        `conta_${conta.id}_${dias}d`,
        `📋 Conta: ${conta.desc}`,
        { body: msg, tag: `conta_${conta.id}`, data: conta },
        delay
      )
    }
  })
}

/**
 * Agenda lembretes para uma prova de concurso.
 *
 * @param {object} concurso  — { nome, dataProva }
 */
export function agendarLembreteConcurso(concurso) {
  if (!concurso.dataProva) return

  const prova  = new Date(concurso.dataProva + 'T08:00:00')
  const agora  = new Date()
  const diasMs = 24 * 60 * 60 * 1000

  const lembretes = [
    { dias: 30, msg: 'Faltam 30 dias! Intensifique os estudos.' },
    { dias: 7,  msg: 'Faltam 7 dias! Revise os pontos principais.' },
    { dias: 3,  msg: 'Faltam 3 dias! Mantenha o foco.' },
    { dias: 1,  msg: 'Prova amanhã! Descanse bem.' },
  ]

  lembretes.forEach(({ dias, msg }) => {
    const data  = new Date(prova.getTime() - dias * diasMs)
    const delay = data.getTime() - agora.getTime()
    if (delay > 0) {
      agendarLembrete(
        `concurso_${dias}d`,
        `🏆 ${concurso.nome || 'Concurso'}`,
        { body: msg, tag: 'concurso', requireInteraction: true },
        delay
      )
    }
  })
}

/**
 * Notificação matinal de rotina (disparada pelo app quando aberto).
 * Ideal para ser chamada no login ou primeiro acesso do dia.
 *
 * @param {number} pendentes  — número de tarefas pendentes
 */
export function notificarRotinaDiaria(pendentes) {
  if (pendentes === 0) return
  notificarAgora('☀️ Bom dia! Sua rotina de hoje', {
    body: `Você tem ${pendentes} tarefa${pendentes > 1 ? 's' : ''} para completar.`,
    tag:  'rotina_diaria',
  })
}

// ── FCM (FUTURO) ──────────────────────────────────────────────────────────────
//
// Para habilitar push notifications em background (quando o app está fechado):
//
// 1. npm install firebase (já instalado)
//
// 2. Criar src/firebase-messaging-sw.js na raiz do public:
//    import { initializeApp } from 'firebase/app'
//    import { getMessaging } from 'firebase/messaging/sw'
//    const app = initializeApp(firebaseConfig)
//    const messaging = getMessaging(app)
//
// 3. Neste arquivo, adicionar:
//    import { getMessaging, getToken, onMessage } from 'firebase/messaging'
//
//    export async function obterTokenFCM(vapidKey) {
//      const messaging = getMessaging()
//      return getToken(messaging, { vapidKey, serviceWorkerRegistration: await navigator.serviceWorker.ready })
//    }
//
//    export function ouvirMensagensFCM(callback) {
//      const messaging = getMessaging()
//      return onMessage(messaging, callback)
//    }
//
// 4. Salvar o token no Firestore: usuarios/{uid}/config/fcm_token
// 5. Configurar Cloud Functions para enviar via Admin SDK

export default {
  pedirPermissao,
  notificacoesAtivas,
  notificarAgora,
  agendarLembrete,
  cancelarLembrete,
  agendarLembreteConta,
  agendarLembreteConcurso,
  notificarRotinaDiaria,
}
