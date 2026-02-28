// ─────────────────────────────────────────────
// 問題データ型
// ─────────────────────────────────────────────

export interface Choice {
  id: string   // 'a' | 'b' | 'c' | 'd'
  text: string
}

export interface Question {
  id: string
  category: string
  grade: 1 | 2 | 3
  questionText: string
  questionType: 'choice' | 'typing' | 'sorting'
  choices?: Choice[]
  correctAnswer: string   // choice: 選択肢ID / typing: 文字列 / sorting: スペース区切り文
  sortWords?: string[]
  explanation: string
  explanationShort: string
  hint: string
}

// ─────────────────────────────────────────────
// ルーム状態型（In-memory store）
// ─────────────────────────────────────────────

export interface Participant {
  id: string
  name: string
  sessionId: string
  joinedAt: Date
}

export interface Answer {
  id: string
  questionId: string
  participantId: string
  participantName: string
  answerText: string
  isCorrect: boolean
  answeredAt: Date
}

export interface RoomState {
  id: string
  code: string              // 6桁入室コード（大文字英数字）
  adminKey: string          // 講師URL用 UUID v4
  mode: 'choice' | 'typing' | 'sorting'
  currentQuestionId: string | null
  showAnswer: boolean
  showExplanation: boolean
  status: 'waiting' | 'active' | 'finished'
  participants: Participant[]
  answers: Answer[]
  createdAt: Date
}

// ─────────────────────────────────────────────
// Pusher イベント型
// ─────────────────────────────────────────────

export interface QuestionChangeEvent {
  questionId: string
  mode: 'choice' | 'typing' | 'sorting'
  showAnswer: boolean
  showExplanation: boolean
}

export interface ShowAnswerEvent {
  showAnswer: boolean
  showExplanation: boolean
}

export interface AnswerSubmittedEvent {
  participantId: string
  participantName: string
  questionId: string
  answerText: string
  isCorrect: boolean
  answeredAt: string
}

export interface ParticipantJoinedEvent {
  participantId: string
  participantName: string
  joinedAt: string
}

export interface RoomFinishedEvent {
  roomId: string
}

export type PusherEventMap = {
  'question-change': QuestionChangeEvent
  'show-answer': ShowAnswerEvent
  'answer-submitted': AnswerSubmittedEvent
  'participant-joined': ParticipantJoinedEvent
  'room-finished': RoomFinishedEvent
}

// ─────────────────────────────────────────────
// API レスポンス型
// ─────────────────────────────────────────────

export interface CreateRoomResponse {
  roomId: string
  roomCode: string
  adminKey: string
  teacherUrl: string
  studentCode: string
}

export interface JoinRoomResponse {
  participantId: string
  sessionId: string
  roomId: string
  roomCode: string
}

export interface RoomStateResponse {
  id: string
  code: string
  mode: RoomState['mode']
  currentQuestionId: string | null
  showAnswer: boolean
  showExplanation: boolean
  status: RoomState['status']
  participantCount: number
  answerCount: number
}
