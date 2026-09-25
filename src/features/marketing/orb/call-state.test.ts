import { describe, expect, it } from 'vitest'
import { stateLabel } from './call-state'

/*
 * The one line under the orb is how a visitor knows whether to talk, wait or
 * type. The microphone switch only changes it while she is listening.
 */

describe('stateLabel', () => {
  it('says the call is connecting while it rings, whatever the microphone', () => {
    expect(stateLabel('ringing', true)).toBe('Đang kết nối…')
    expect(stateLabel('ringing', false)).toBe('Đang kết nối…')
  })

  it('says she is speaking while she speaks', () => {
    expect(stateLabel('speaking', false)).toBe('Fonnus đang nói')
  })

  it('says she is listening, or that the microphone is off and typing works', () => {
    expect(stateLabel('listening', true)).toBe('Fonnus đang nghe')
    expect(stateLabel('listening', false)).toBe('Micro đang tắt — bạn có thể gõ chữ')
  })
})
