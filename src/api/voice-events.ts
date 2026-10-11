/**
 * The event stream every voice session hands the call screen: the contract's
 * `subscribe` semantics in one place, for the scripted session and the live one.
 *
 * A session can speak the moment it is created, before the hook that waits on
 * `connect` has subscribed; a new listener is therefore handed the latest event
 * synchronously, or the label would sit on "connecting" through the greeting.
 * After `close()` nothing is delivered and no listener is kept.
 *
 * Generic and import-free on purpose: no browser API, no timer, no contract.
 */
export interface VoiceEvents<E> {
  /** Records the event as the latest and delivers it, unless closed. */
  emit(event: E): void
  /** Hands the listener the latest event at once. Returns the unsubscribe. */
  subscribe(listener: (event: E) => void): () => void
  /** Stops all delivery and drops every listener. Idempotent. */
  close(): void
  isClosed(): boolean
}

export function createVoiceEvents<E>(initial: E): VoiceEvents<E> {
  const listeners = new Set<(event: E) => void>()
  let latest = initial
  let closed = false

  return {
    emit(event) {
      if (closed) return
      latest = event
      // A listener may unsubscribe while being called; iterate a copy.
      for (const listener of [...listeners]) listener(event)
    },

    subscribe(listener) {
      if (closed) return () => undefined
      listeners.add(listener)
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
