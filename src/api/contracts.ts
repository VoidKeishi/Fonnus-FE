/**
 * Every promise the frontend makes to the backend, in one file.
 *
 * Types only — no implementation, and no import from `./http`, `*.mock.ts` or
 * `*.live.ts`. Both implementations of each group are typed against the
 * interfaces here, so `pnpm typecheck` fails the moment the live version drifts
 * from the mock. That is the whole safety mechanism.
 *
 * Wire shapes are documented in `docs/api-contract.md`; the field names come
 * from `docs/field-catalogue-mapping.md`. When you change an interface here,
 * change that document in the same commit.
 *
 * The `auth`, `leads` and `voice` groups exist today. The other groups of the
 * contract — tenant, assistant, receptionist — arrive with the screens that
 * call them (PLAN.md); nothing ships ahead of its first consumer. `voice` has
 * no mock (ADR 0007), so it is the one group missing from `API_GROUPS`.
 */

/** Every method takes this, so a caller can cancel on unmount. */
export interface Signal {
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type AuthMethod = 'phone' | 'email' | 'google';

/**
 * The signed-in owner. `GET /me`.
 *
 * `plan` is here because the sidebar renders it; today it comes from a
 * hardcoded demo constant, which is a lie the moment there are two customers.
 */
export interface Me {
  /** National-format phone, the email, or the Google address that signed in. */
  identity: string;
  method: AuthMethod;
  display_name: string;
  clinic_name?: string;
  plan?: string;
}

export interface GoogleAccount {
  initials: string;
  name: string;
  email: string;
}

export interface AuthApi {
  /** `GET /me`. Resolves `null` for an anonymous visitor — a 401 here is a normal answer. */
  me(opts?: Signal): Promise<Me | null>;

  /** `POST /auth/otp`. `existing_account` turns a sign-up into a sign-in. */
  sendPhoneCode(phone: string, opts?: Signal): Promise<{ existing_account: boolean }>;

  /** `POST /auth/otp/email`. Deliberately discloses nothing about the address. */
  sendEmailCode(email: string, opts?: Signal): Promise<void>;

  /** `POST /auth/otp/verify`. On success the server sets the session cookie. */
  verifyCode(input: { identity: string; code: string }, opts?: Signal): Promise<Me>;

  /** `PATCH /me`. The account already exists once a code has verified. */
  updateProfile(input: { full_name?: string; phone?: string }, opts?: Signal): Promise<Me>;

  /** `POST /auth/signout`. Clears the cookie server-side. */
  signOut(opts?: Signal): Promise<void>;

  /**
   * The accounts the in-page Google chooser offers. Empty in live mode, where
   * the chooser is replaced by a redirect to the OAuth endpoint.
   */
  googleAccounts(): readonly GoogleAccount[];

  /**
   * Live: the OAuth URL to send the browser to. Mock: `null`, meaning "render
   * the in-page chooser instead".
   */
  googleAuthUrl(): string | null;

  /** Completes the in-page chooser. Live throws: the redirect signs you in instead. */
  signInWithGoogle(account: GoogleAccount, opts?: Signal): Promise<Me>;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/**
 * The landing page's contact form: who to ring back, and at which clinic.
 * Both names at most `MAX_NAME_LENGTH` (`./lead-limits`) once trimmed.
 */
export interface LeadInput {
  clinic_name: string;
  contact_name: string;
  /**
   * National form, digits only: a mobile (`0901234567`), a fixed line
   * (`02838221234`) or a 1800/1900 hotline (`19001234`). See
   * `normalizeCallbackNumber` in `./phone`.
   */
  phone: string;
}

/** One clinic site to ring: where it is, and the number patients call. */
export interface HotlineLocation {
  /** At most `MAX_ADDRESS_LENGTH` (`./lead-limits`) once trimmed. */
  address: string;
  /** National form, digits only, as `LeadInput.phone`: `02838221234`, `0901234567`, `19001234`. */
  phone: string;
}

/**
 * The "Chấm điểm hotline" page: who asks, where the report goes, which numbers
 * to ring. Caps from `./lead-limits`, measured on the trimmed text.
 */
export interface HotlineReportInput {
  /** At most `MAX_NAME_LENGTH`. */
  contact_name: string;
  /** Where the report is sent. At most `MAX_EMAIL_LENGTH`. */
  email: string;
  /** A clinic, or the chain that owns several. At most `MAX_NAME_LENGTH`. */
  clinic_name: string;
  /** At least one, at most `MAX_LOCATIONS` (20). */
  locations: HotlineLocation[];
}

/**
 * The waitlist page: who to ring when the clinic's turn comes, and where to
 * send the setup guide. The name at most `MAX_NAME_LENGTH`, the email at most
 * `MAX_EMAIL_LENGTH` (`./lead-limits`), both once trimmed.
 */
export interface WaitlistInput {
  contact_name: string;
  /** National form, digits only, as `LeadInput.phone`: `0901234567`, `02838221234`, `19001234`. */
  phone: string;
  email: string;
}

/**
 * Received by this app's own route handlers, not Fonnus-BE (ADR 0005): the
 * paths are on this origin, outside `/api/v1`.
 */
export interface LeadsApi {
  /** `POST /api/leads`. Unauthenticated: the landing page's contact form. */
  submit(input: LeadInput, opts?: Signal): Promise<void>;
  /** `POST /api/leads/hotline-report`. Unauthenticated: the "Chấm điểm hotline" page. */
  requestHotlineReport(input: HotlineReportInput, opts?: Signal): Promise<void>;
  /** `POST /api/leads/waitlist`. Unauthenticated: the waitlist page. */
  joinWaitlist(input: WaitlistInput, opts?: Signal): Promise<void>;
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

/** What the receptionist is doing, as the call screen's one line says it. */
export type VoiceAgentState = 'connecting' | 'speaking' | 'listening';

/** `user` closed it; `agent` ended the call; `timeout` is the duration cap; `error` is anything else. */
export type VoiceEndReason = 'user' | 'agent' | 'error' | 'timeout';

/**
 * How the visitor talks to the receptionist. `voice` is a call; `text` is the
 * same conversation typed, for a browser that gives no microphone (ADR 0007).
 */
export type VoiceInput = 'voice' | 'text';

/**
 * Only what the screen reads. Audio and loudness are deliberately not events —
 * see `getAmplitude`. `message` is a line of the conversation, and only a text
 * session sends it: the voice screen shows no transcript.
 */
export type VoiceEvent =
  | { type: 'state'; state: VoiceAgentState }
  | { type: 'message'; from: 'agent' | 'visitor'; text: string }
  | { type: 'ended'; reason: VoiceEndReason };

/**
 * Where the visitor's hour stands: three minutes of conversation an hour, kept
 * by whoever mints the ticket (ADR 0008, ADR 0009). Epoch milliseconds.
 */
export interface VoiceBudget {
  remaining_ms: number;
  /** When the full budget is back; `null` while the full budget is there. */
  resets_at: number | null;
}

/**
 * One conversation with the receptionist. The landing demo's today; the F3
 * try-out's once Fonnus-BE serves a voice gateway (ADR 0006).
 */
export interface VoiceSession {
  /**
   * What this ticket may spend and when the hour is back, as the ticket's
   * answer said. The session ends itself with `timeout` once `remaining_ms`
   * has run, at the implementation's own maximum at most.
   */
  readonly budget: VoiceBudget;

  /**
   * Returns the unsubscribe. A new listener is first handed, synchronously,
   * every `message` so far and then the latest of the other events, so a
   * caller that subscribes after `connect` resolves still learns that she is
   * already speaking, and still reads her first line. Nothing is delivered
   * after `close()` resolves.
   */
  subscribe(listener: (event: VoiceEvent) => void): () => void;

  /**
   * The UI's entire microphone surface. The session owns getUserMedia and
   * everything downstream of it — sample rate, framing and codec are exactly
   * what changes with the transport, and no component should have to know.
   * A no-op in a text session, which has no microphone.
   */
  setMicEnabled(on: boolean): Promise<void>;

  /**
   * For callers who would rather type: a chip or the typed line. A text
   * session also emits it back as the visitor's `message`, so the thread has
   * one source whether or not the vendor echoes typed input.
   */
  sendText(text: string): void;

  /**
   * The visitor is doing something that is not yet a line: typing in the box.
   * Without it the agent hears silence, and her turn timeout can end the
   * conversation while the visitor is still typing. Call it on every input
   * change; the implementation throttles it. Inert once the session has ended.
   */
  noteActivity(): void;

  /**
   * Output loudness 0..1, or null when silent, which a text session always
   * is. Polled from the orb's requestAnimationFrame loop, never pushed
   * through React state: a 60fps signal there would re-render every consumer
   * each frame.
   */
  getAmplitude(): number | null;

  /** Idempotent. Emits `ended { reason: 'user' }` once if the session had not ended already. */
  close(): Promise<void>;
}

export interface VoiceApi {
  /**
   * Where the visitor's hour stands. Read, never kept: the screen asks again
   * whenever it needs the number (ADR 0009 point 4).
   */
  budget(opts?: Signal): Promise<VoiceBudget>;

  /**
   * Opens a session. Call it from inside the click that asked for the call:
   * an implementation that plays audio needs that gesture for autoplay.
   *
   * Rejects with `microphone_unavailable` when `input` is `voice` and the
   * browser gives no microphone, for any reason; the caller then connects
   * again with `text`. Rejects with `voice_unavailable` when nothing could
   * connect in time or `challenge` gave no proof, or with whatever `http.ts`
   * makes of the ticket's refusal: `budget_spent` (kind `ratelimited`) when
   * nothing of the hour is left, `forbidden` when the route refused the proof.
   *
   * The session's cap comes with its ticket, not from the caller: see
   * `VoiceSession.budget`.
   */
  connect(opts: {
    mode: 'landing-demo';
    input: VoiceInput;
    signal?: AbortSignal | undefined;
    /**
     * The proof the ticket route asks for (ADR 0009 point 5), obtained when
     * the route is about to be called: after the microphone grant for a call,
     * first thing for a text session, under the connection budget, whose
     * signal it is handed. A rejection, or no answer within the budget, is
     * `voice_unavailable`: no proof, no ticket.
     *
     * It may be called more than once in one tap — the voice attempt and the
     * text one after a refused microphone — and must then hand out a token no
     * earlier call returned: a token returned is taken as spent. The live
     * implementation calls it only after the microphone grant, so a refused
     * microphone leaves the tap's one unused token to the text attempt.
     */
    challenge: (signal: AbortSignal) => Promise<string>;
  }): Promise<VoiceSession>;
}

// ---------------------------------------------------------------------------
// The aggregate
// ---------------------------------------------------------------------------

export interface FonnusApi {
  auth: AuthApi;
  leads: LeadsApi;
  voice: VoiceApi;
}

/**
 * The group names `NEXT_PUBLIC_API_LIVE_GROUPS` accepts. Not `voice`: it has
 * no mock and is always live (ADR 0007).
 */
export const API_GROUPS = ['auth', 'leads'] as const;

export type ApiGroup = (typeof API_GROUPS)[number];
