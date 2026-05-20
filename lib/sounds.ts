'use client'

// ─────────────────────────────────────────────
// Sound Effects (Web Audio API)
// ─────────────────────────────────────────────

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Play correct answer chime: C-E-G major chord arpeggio
 * Sine wave, 0.2 gain, 0.3s total
 */
export function playCorrectSound(): void {
  try {
    const ctx = getAudioContext()
    const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
    const gain = 0.2
    const noteDuration = 0.1
    const now = ctx.currentTime

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      gainNode.gain.setValueAtTime(0, now + i * noteDuration)
      gainNode.gain.linearRampToValueAtTime(gain, now + i * noteDuration + 0.02)
      gainNode.gain.linearRampToValueAtTime(0, now + i * noteDuration + noteDuration)

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.start(now + i * noteDuration)
      osc.stop(now + i * noteDuration + noteDuration + 0.05)
    })
  } catch {
    // Audio not available — silently ignore
  }
}

/**
 * Play wrong answer buzzer: square wave sweeping 150Hz -> 100Hz
 * 0.2 gain, 0.2s duration
 */
export function playWrongSound(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.linearRampToValueAtTime(100, now + 0.2)

    gainNode.gain.setValueAtTime(0.2, now)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2)

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.25)
  } catch {
    // Audio not available — silently ignore
  }
}

// ─────────────────────────────────────────────
// Text-to-Speech (English)
// ─────────────────────────────────────────────

/**
 * Speak English text using the browser's SpeechSynthesis API.
 * Picks an English voice if available.
 */
export function speakEnglish(text: string): void {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    utterance.pitch = 1.0

    // Try to pick an English voice
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(
      (v) => v.lang.startsWith('en') && v.localService
    ) || voices.find((v) => v.lang.startsWith('en'))
    if (englishVoice) {
      utterance.voice = englishVoice
    }

    window.speechSynthesis.speak(utterance)
  } catch {
    // TTS not available — silently ignore
  }
}

// ─────────────────────────────────────────────
// Wrong Answer Tracking (localStorage)
// ─────────────────────────────────────────────

const WRONG_ANSWERS_KEY = 'grammar-app-wrong-answers'

export interface WrongAnswerRecord {
  questionId: string
  questionText: string
  category: string
  grade: number
  correctAnswer: string
  userAnswer: string
  timestamp: string
  count: number
}

/**
 * Get all wrong answer records from localStorage
 */
export function getWrongAnswers(): WrongAnswerRecord[] {
  try {
    const stored = localStorage.getItem(WRONG_ANSWERS_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Record a wrong answer into localStorage.
 * If the same question was already wrong, increment the count.
 */
export function recordWrongAnswer(record: Omit<WrongAnswerRecord, 'timestamp' | 'count'>): void {
  try {
    const records = getWrongAnswers()
    const existing = records.find((r) => r.questionId === record.questionId)

    if (existing) {
      existing.count += 1
      existing.userAnswer = record.userAnswer
      existing.timestamp = new Date().toISOString()
    } else {
      records.push({
        ...record,
        timestamp: new Date().toISOString(),
        count: 1,
      })
    }

    localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(records))
  } catch {
    // localStorage not available — silently ignore
  }
}

/**
 * Remove a wrong answer record (e.g., when the student later gets it right)
 */
export function removeWrongAnswer(questionId: string): void {
  try {
    const records = getWrongAnswers().filter((r) => r.questionId !== questionId)
    localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(records))
  } catch {
    // silently ignore
  }
}

/**
 * Clear all wrong answer records
 */
export function clearWrongAnswers(): void {
  try {
    localStorage.removeItem(WRONG_ANSWERS_KEY)
  } catch {
    // silently ignore
  }
}
