import { describe, it, expect } from 'vitest'
import { getResourceProgress, saveResourceProgress, clearResourceProgress } from '../services/resourceProgress'

const uid = 'u1'
const rid = 'r1'

describe('resourceProgress', () => {
  it('save y get persisten progreso', () => {
    saveResourceProgress(uid, rid, { stage: 'study' })
    const prog = getResourceProgress(uid, rid)
    expect(prog?.stage).toBe('study')
  })
  it('clear borra progreso', () => {
    clearResourceProgress(uid, rid)
    const prog = getResourceProgress(uid, rid)
    expect(prog).toBeNull()
  })
})
