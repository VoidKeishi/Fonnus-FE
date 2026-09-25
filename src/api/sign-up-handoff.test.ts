import { afterEach, describe, expect, it, vi } from 'vitest'
import { stashPhone, takePhone } from './sign-up-handoff'

/*
 * The hand-off is the only thing that carries the hero's number to sign-up, and
 * it runs in three places that behave differently: a normal tab, a private tab
 * whose storage throws, and the server render, where there is no window at all.
 * Vitest runs in Node, so a plain object stands in for the tab's storage.
 */

function fakeSessionStorage() {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
    removeItem: (key: string) => {
      items.delete(key)
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the sign-up hand-off', () => {
  it('hands the number over once, under the key sign-up reads', () => {
    const storage = fakeSessionStorage()
    vi.stubGlobal('window', { sessionStorage: storage })

    stashPhone('0914378064')
    expect(storage.items.get('fonnus.signup.phone')).toBe('0914378064')
    expect(takePhone()).toBe('0914378064')
    expect(takePhone()).toBe('')
  })

  it('gives up quietly when the browser refuses storage, as a private tab does', () => {
    const refuse = () => {
      throw new Error('SecurityError')
    }
    vi.stubGlobal('window', { sessionStorage: { getItem: refuse, setItem: refuse, removeItem: refuse } })

    expect(() => {
      stashPhone('0914378064')
    }).not.toThrow()
    expect(takePhone()).toBe('')
  })

  it('does nothing during a server render, where there is no window', () => {
    expect(() => {
      stashPhone('0914378064')
    }).not.toThrow()
    expect(takePhone()).toBe('')
  })
})
