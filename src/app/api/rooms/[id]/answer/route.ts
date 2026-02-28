import { NextRequest, NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/room-store'
import { pusherServer } from '@/lib/pusher'
import { checkAnswer, generateId } from '@/lib/utils'
import { questions } from '@/src/data/questions'
import { Answer } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const { participantId, questionId, answerText } = await request.json()

  const participant = room.participants.find(p => p.id === participantId)
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  const question = questions.find(q => q.id === questionId)
  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  // Check if already answered this question
  const existingAnswer = room.answers.find(
    a => a.participantId === participantId && a.questionId === questionId
  )
  if (existingAnswer) {
    return NextResponse.json({ error: 'Already answered' }, { status: 409 })
  }

  const isCorrect = checkAnswer(answerText, question.correctAnswer, room.mode)

  const answer: Answer = {
    id: generateId(),
    questionId,
    participantId,
    participantName: participant.name,
    answerText,
    isCorrect,
    answeredAt: new Date(),
  }

  room.answers.push(answer)
  setRoom(room)

  await pusherServer.trigger(`room-${room.id}`, 'answer-submitted', {
    participantId,
    participantName: participant.name,
    questionId,
    answerText,
    isCorrect,
  })

  return NextResponse.json({ isCorrect })
}
