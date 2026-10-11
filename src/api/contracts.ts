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
 * Received by this app's own route handlers, not Fonnus-BE (ADR 0005): the
 * paths are on this origin, outside `/api/v1`.
 */
export interface LeadsApi {
  /** `POST /api/leads`. Unauthenticated: the landing page's contact form. */
  submit(input: LeadInput, opts?: Signal): Promise<void>;
  /** `POST /api/leads/hotline-report`. Unauthenticated: the "Chấm điểm hotline" page. */
  requestHotlineReport(input: HotlineReportInput, opts?: Signal): Promise<void>;
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

/** What the receptionist is doing, as the call screen's one line says it. */
export type VoiceAgentState = 'connecting' | 'speaking' | 'listening';

/** `user` closed it; `agent` ended the call; `timeout` is the duration cap; `error` is anything else. */
export type VoiceEndReason = 'user' | 'agent' | 'error' | 'timeout';

/** Only what the screen reads. Audio and loudness are deliberately not events — see `getAmplitude`. */
export type VoiceEvent =
  | { type: 'state'; state: VoiceAgentState }
  | { type: 'ended'; reason: VoiceEndReason };

/**
 * One conversation with the receptionist. The landing demo's today; the F3
 * try-out's once Fonnus-BE serves a voice gateway (ADR 0006).
 */
export interface VoiceSession {
  /**
   * Returns the unsubscribe. A new listener is first handed the latest event,
   * synchronously, so a caller that subscribes after `connect` resolves still
   * learns that she is already speaking. Nothing is delivered after `close()`
   * resolves.
   */
  subscribe(listener: (event: VoiceEvent) => void): () => void;

  /**
   * The UI's entire microphone surface. The session owns getUserMedia and
   * everything downstream of it — sample rate, framing and codec are exactly
   * what changes with the transport, and no component should have to know.
   */
  setMicEnabled(on: boolean): Promise<void>;

  /** For callers who would rather type: a chip or the typed line. */
  sendText(text: string): void;

  /**
   * Output loudness 0..1, or null when silent. Polled from the orb's
   * requestAnimationFrame loop, never pushed through React state: a 60fps
   * signal there would re-render every consumer each frame.
   */
  getAmplitude(): number | null;

  /** Idempotent. Emits `ended { reason: 'user' }` once if the session had not ended already. */
  close(): Promise<void>;
}

export interface VoiceApi {
  /**
   * Opens a session. Call it from inside the click that asked for the call:
   * an implementation that plays audio needs that gesture for autoplay.
   *
   * Rejects with `microphone_unavailable` when the browser gives no microphone,
   * for any reason. Rejects with `voice_unavailable` when nothing could
   * connect in time, or with whatever `http.ts` makes of the ticket's refusal.
   */
  connect(opts: { mode: 'landing-demo'; signal?: AbortSignal | undefined }): Promise<VoiceSession>;
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
