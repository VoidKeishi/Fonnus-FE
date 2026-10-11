/**
 * The event stream every voice session hands the call screen: the contract's
 * `subscribe` semantics in one place.
 *
 * A session can speak the moment it is created, before the hook that waits on
 * `connect` has subscribed; a new listener is therefore handed the latest event
 * synchronously, or the label would sit on "connecting" through her first
 * sentence. Events that `isKept` marks — the lines of a text conversation —
 * are not replaced by the next one: a new listener is handed all of them, in
 * order, before the latest of the others. The SDK can deliver her first line
 * before `connect` has resolved, and that line is the one saying she is an AI.
 * After `close()` nothing is delivered and no listener is kept.
 *
 * Generic and import-free on purpose: no browser API, no timer, no contract.
 */
export interface VoiceEvents<E> {
  /** Delivers the event and records it as the latest, or adds it to the kept ones; unless closed. */
  emit(event: E): void
  /** Hands the listener every kept event, then the latest, at once. Returns the unsubscribe. */
  subscribe(listener: (event: E) => void): () => void
  /** Stops all delivery and drops every listener. Idempotent. */
  close(): void
  isClosed(): boolean
}

export function createVoiceEvents<E>(initial: E, isKept: (event: E) => boolean = () => false): VoiceEvents<E> {
  const listeners = new Set<(event: E) => void>()
  const kept: E[] = []
  let latest = initial
  let closed = false

  return {
    emit(event) {
      if (closed) return
      if (isKept(event)) kept.push(event)
      else latest = event
      // A listener may unsubscribe while being called; iterate a copy.
      for (const listener of [...listeners]) listener(event)
    },

    subscribe(listener) {
      if (closed) return () => undefined
      listeners.add(listener)
      for (const event of kept) listener(event)
      listener(latest)
      return () => {
        listeners.delete(listener)
      }
    },

    close() {
      closed = true
      listeners.clear()
    },

    isClosed() {
      return closed
    },
  }
}
