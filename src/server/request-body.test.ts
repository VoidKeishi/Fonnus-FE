import { describe, expect, it } from 'vitest'
import { MAX_BODY_BYTES, isJsonMediaType, readCappedText } from './request-body'

/*
 * The first two gates of a public endpoint. The media type decides whether
 * another site can make a visitor's browser post here without a preflight;
 * the size cap decides how much of a hostile body is ever held. And the body
 * arrives in chunks, which may cut a Vietnamese letter in half.
 */

function streamOf(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

describe('isJsonMediaType', () => {
  it.each(['application/json', 'application/json; charset=utf-8', 'Application/JSON'])('accepts %s', (type) => {
    expect(isJsonMediaType(type)).toBe(true)
  })

  it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x'])(
    'refuses %s, which another site can send without a preflight',
    (type) => {
      expect(isJsonMediaType(type)).toBe(false)
    },
  )

  it('refuses a request with no Content-Type', () => {
    expect(isJsonMediaType(null)).toBe(false)
  })
})

describe('readCappedText', () => {
  it('accepts a body of exactly 48 KiB', async () => {
    expect(MAX_BODY_BYTES).toBe(49152)
    const text = await readCappedText(streamOf(new Uint8Array(49152).fill(0x61)))
    expect(text).toHaveLength(49152)
  })

  it('refuses one byte more, even when it arrives in a later chunk', async () => {
    expect(await readCappedText(streamOf(new Uint8Array(49152).fill(0x61), new Uint8Array(1).fill(0x61)))).toBeNull()
  })

  it('decodes a Vietnamese letter split across two chunks', async () => {
    const bytes = new TextEncoder().encode('{"contact_name":"Nguyễn Minh Anh"}')
    // `ễ` is three bytes in UTF-8; cut inside it.
    const cut = new TextEncoder().encode('{"contact_name":"Nguy').length + 1
    expect(new TextDecoder().decode(bytes.slice(0, cut)).endsWith('�')).toBe(true)
    expect(await readCappedText(streamOf(bytes.slice(0, cut), bytes.slice(cut)))).toBe('{"contact_name":"Nguyễn Minh Anh"}')
  })

  it('reads a request with no body as empty', async () => {
    expect(await readCappedText(null)).toBe('')
  })
})
