import { describe, expect, it } from 'vitest'
import { stateLabel } from './call-state'

/*
 * The one line under the orb is how a visitor knows whether to talk, wait or
 * type. The microphone switch only changes it while she is listening in a
 * call; a typed conversation has no microphone and says whether to wait or
 * write.
 */

describe('stateLabel, in a call', () => {
  it('says the call is connecting while it connects, whatever the microphone', () => {
    expect(stateLabel('connecting', true, 'voice')).toBe('Đang kết nối…')
    expect(stateLabel('connecting', false, 'voice')).toBe('Đang kết nối…')
  })

  it('says she is speaking while she speaks', () => {
    expect(stateLabel('speaking', false, 'voice')).toBe('Fonnus đang nói')
  })

  it('says she is listening, or that the microphone is off and typing works', () => {
    expect(stateLabel('listening', true, 'voice')).toBe('Fonnus đang nghe')
    expect(stateLabel('listening', false, 'voice')).toBe('Micro đang tắt — bạn có thể gõ chữ')
  })
})

describe('stateLabel, typed', () => {
  it('says the conversation is connecting while it connects', () => {
    expect(stateLabel('connecting', true, 'text')).toBe('Đang kết nối…')
  })

  it('says Linh is answering while her reply is on its way, whatever the microphone', () => {
    expect(stateLabel('speaking', true, 'text')).toBe('Linh đang trả lời…')
    expect(stateLabel('speaking', false, 'text')).toBe('Linh đang trả lời…')
  })

  it('says Linh is waiting for a message once she has answered, whatever the microphone', () => {
    expect(stateLabel('listening', true, 'text')).toBe('Linh đang chờ bạn nhắn')
    expect(stateLabel('listening', false, 'text')).toBe('Linh đang chờ bạn nhắn')
  })
})
