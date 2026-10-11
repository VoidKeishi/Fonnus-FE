/**
 * The voice demo, faked in the browser: the scripted session of
 * `voice-scripted.ts`, Linh's recorded greeting and then a script.
 *
 * `NEXT_PUBLIC_MOCK_FAILURE_RATE` makes `connect` reject, which walks the call
 * demo's fallback — to the same scripted session, so the visitor sees no
 * difference (ADR 0006 point 7).
 */
import type { VoiceApi } from './contracts'
import { ApiError } from './errors'
import { maybeFail } from './mock-support'
import { scriptedVoiceSession } from './voice-scripted'

export const voiceMock: VoiceApi = {
  connect(opts) {
    // No `delay()`, and no `await` before the session: the executor runs in the
    // caller's own turn, so the greeting starts inside the click that called
    // this, which autoplay requires. The recording is latency enough. A throw
    // in here rejects the promise.
    return new Promise((resolve) => {
      if (opts.signal?.aborted) throw new ApiError({ kind: 'canceled' })
      maybeFail()
      resolve(scriptedVoiceSession())
    })
  },
}
