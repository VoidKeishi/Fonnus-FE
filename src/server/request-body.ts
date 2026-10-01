/*
 * What a form's request must look like before anything reads it. Pure: it
 * depends only on the Web stream and text APIs, so it is tested without a
 * server.
 */

/**
 * Sized from the caps in `src/api/lead-limits.ts`, by the larger form. The
 * contact form fits in far less; the fullest hotline report those caps allow —
 * 20 locations with 500-character addresses, two 200-character names, a
 * 254-character email, every character three bytes — is about 33 KB of compact
 * JSON. 48 KiB leaves room above that without letting a large body through.
 * Raising a cap there means rechecking this.
 */
export const MAX_BODY_BYTES = 48 * 1024

/**
 * Whether the `Content-Type` names JSON, parameters such as `charset` aside.
 *
 * Not a formality: `text/plain` and form encodings make a CORS "simple
 * request", which any other site can have a visitor's browser send without a
 * preflight — a row appended from that visitor's IP, beyond the reach of the
 * per-IP rate limit. JSON forces the preflight, and the route answers it with
 * no CORS headers.
 */
export function isJsonMediaType(contentType: string | null): boolean {
  const [mediaType = ''] = (contentType ?? '').split(';')
  return mediaType.trim().toLowerCase() === 'application/json'
}

/**
 * The body as UTF-8 text, or `null` once it passes `MAX_BODY_BYTES` — read no
 * further than that, so an oversized body is never held whole.
 */
export async function readCappedText(body: ReadableStream<Uint8Array> | null): Promise<string | null> {
  if (body === null) return ''
  const reader = body.getReader()
  // Streaming, so a character split across two chunks is decoded whole.
  const decoder = new TextDecoder()
  let text = ''
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}
