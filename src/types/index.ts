export type QuestionType = 'choice' | 'typing' | 'sorting'

export interface Choice {
  id: string
  text: string
}

export interface Question {
  id: string
  category: string
  grade: 1 | 2 | 3
  questionText: string
  questionType: QuestionType
  choices?: Choice[]
  correctAnswer: string
  sortWords?: string[]
  explanation: string
  explanationShort: string
  hint: string
}

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
  code: string
  adminKey: string
  mode: QuestionType
  currentQuestionId: string | null
  showAnswer: boolean
  showExplanation: boolean
  status: 'waiting' | 'active' | 'finished'
  participants: Participant[]
  answers: Answer[]
  createdAt: Date
}

// Pusher event payloads
export interface QuestionChangePayload {
  questionId: string
  mode: QuestionType
}

export interface ShowAnswerPayload {
  showAnswer: boolean
  showExplanation: boolean
  correctAnswer: string
}

export interface AnswerSubmittedPayload {
  participantId: string
  participantName: string
  questionId: string
  answerText: string
  isCorrect: boolean
}

export interface ParticipantJoinedPayload {
  participantId: string
  name: string
}
