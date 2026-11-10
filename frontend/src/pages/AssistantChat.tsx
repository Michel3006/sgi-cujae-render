import React from "react"
import { Bot, Loader2, Send, User } from "lucide-react"
import { chatService } from "../services/chatService"
import { useToast } from "../contexts/ToastContext"
import "./AssistantChat.css"

type Message = {
  role: "user" | "assistant"
  content: string
}

const ASSISTANT_CHAT_STORAGE_KEY = "sgi_assistant_chat_history_v1"

const getDefaultMessages = (): Message[] => [
  {
    role: "assistant",
    content: "Hola, soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
  },
]

const parseStoredMessages = (raw: string | null): Message[] | null => {
  if (raw == null || raw === "") return null
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data) || data.length === 0) return null
    const next: Message[] = []
    for (const item of data) {
      if (item == null || typeof item !== "object") continue
      const m = item as Partial<Message>
      if (
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
      ) {
        next.push({ role: m.role, content: m.content })
      }
    }
    return next.length > 0 ? next : null
  } catch {
    return null
  }
}

const readInitialMessages = (): Message[] => {
  if (typeof window === "undefined") return getDefaultMessages()
  try {
    return parseStoredMessages(localStorage.getItem(ASSISTANT_CHAT_STORAGE_KEY)) ?? getDefaultMessages()
  } catch {
    return getDefaultMessages()
  }
}

export const AssistantChat: React.FC = () => {
  const { showToast } = useToast()
  const [messages, setMessages] = React.useState<Message[]>(readInitialMessages)
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    try {
      localStorage.setItem(ASSISTANT_CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* límite de almacenamiento u origen restringido */
    }
  }, [messages])

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: "user", content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const response = await chatService.sendMessage(trimmed)
      const assistantText =
        response?.answer?.trim() || "No se recibió contenido de respuesta."
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }])
    } catch {
      showToast("No se pudo enviar el mensaje. Inténtalo nuevamente.", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleResetChat = () => {
    if (
      !window.confirm(
        "¿Reiniciar la conversación? Se borrará el historial guardado en este navegador y empezarás de nuevo.",
      )
    ) {
      return
    }
    const fresh = getDefaultMessages()
    setMessages(fresh)
    setInput("")
    try {
      localStorage.setItem(ASSISTANT_CHAT_STORAGE_KEY, JSON.stringify(fresh))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="assistant-chat-page form-page">
      <p className="page-toolbar__lead form-page__toolbar-intro">
        Haz preguntas sobre los datos; el asistente consultará la base y te responderá.
      </p>
      <div className="assistant-chat-card">
        <div className="assistant-chat-header">
          <p className="assistant-chat-header__hint">Escribe tu consulta y pulsa Enviar o Enter.</p>
          <button
            type="button"
            className="assistant-chat-reset"
            onClick={handleResetChat}
            aria-label="Reiniciar conversación y borrar el historial guardado"
          >
            Reiniciar conversación
          </button>
        </div>

        <div className="assistant-chat-body" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`chat-row ${m.role === "user" ? "chat-row--user" : "chat-row--assistant"}`}
            >
              <div className="chat-message-block">
                {m.role === "assistant" && (
                  <div className="chat-avatar chat-avatar--assistant" aria-hidden="true">
                    <Bot size={18} strokeWidth={2} />
                  </div>
                )}
                <div className="chat-message-content">
                  <span className="chat-role-label">
                    {m.role === "user" ? "Tú" : "Asistente"}
                  </span>
                  <div className={`chat-bubble chat-bubble--${m.role}`}>
                    <div className="chat-text">{m.content}</div>
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="chat-avatar chat-avatar--user" aria-hidden="true">
                    <User size={18} strokeWidth={2} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-row chat-row--assistant">
              <div className="chat-message-block">
                <div className="chat-avatar chat-avatar--assistant" aria-hidden="true">
                  <Bot size={18} strokeWidth={2} />
                </div>
                <div className="chat-message-content">
                  <span className="chat-role-label">Asistente</span>
                  <div className="chat-bubble chat-bubble--assistant chat-bubble--typing" aria-busy="true">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="assistant-chat-input">
          <label htmlFor="assistant-chat-message" className="visually-hidden">
            Escribe tu mensaje
          </label>
          <textarea
            id="assistant-chat-message"
            className="assistant-textarea"
            placeholder="Escribe tu pregunta… (Enter envía, Shift+Enter nueva línea)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
            aria-label="Mensaje para el asistente"
          />
          <button
            type="button"
            className={`assistant-send-icon${input.trim() && !loading ? " assistant-send-icon--ready" : ""}`}
            onClick={handleSend}
            disabled={loading}
            aria-label={loading ? "Enviando mensaje" : "Enviar mensaje"}
            title="Enviar"
          >
            {loading ? (
              <Loader2 className="assistant-send-icon-svg assistant-send-icon-svg--spin" size={22} aria-hidden="true" />
            ) : (
              <Send className="assistant-send-icon-svg" size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
