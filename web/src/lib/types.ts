/** Mirrors QueryRequest / QueryResponse in main.py. */
export interface QueryRequest {
  query: string
  session_id?: string | null
}

export interface QueryResponse {
  response: string
  session_id: string
  request_id: string
  faithfulness_score: number
  completeness_score: number
  validation_passed: boolean
  model_used: string
}

export interface HealthResponse {
  status: string
  graph_ready: boolean
}

export type MessageStatus = 'pending' | 'done' | 'error'

export interface UserMessage {
  id: string
  role: 'user'
  content: string
  createdAt: number
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  status: MessageStatus
  content: string
  createdAt: number
  /** The user message this answers; used to retry a failed request. */
  replyTo: string
  meta?: Omit<QueryResponse, 'response' | 'session_id'>
  error?: string
  latencyMs?: number
}

export type Message = UserMessage | AssistantMessage

export interface Conversation {
  id: string
  title: string
  /** Server-side LangGraph thread id, set by the first successful response. */
  sessionId: string | null
  messages: Message[]
  createdAt: number
  updatedAt: number
}
