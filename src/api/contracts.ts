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
 * The `auth` and `leads` groups exist today. The other groups of the contract —
 * tenant, assistant, receptionist, voice — arrive with the screens that call
 * them (PLAN.md); nothing ships ahead of its first consumer.
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

/** The landing page's contact form: who to ring back, and at which clinic. */
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
  address: string;
  /** National form, digits only, as `LeadInput.phone`: `02838221234`, `0901234567`, `19001234`. */
  phone: string;
}

/** The "Chấm điểm hotline" page: who asks, where the report goes, which numbers to ring. */
export interface HotlineReportInput {
  contact_name: string;
  /** Where the report is sent. */
  email: string;
  /** A clinic, or the chain that owns several. */
  clinic_name: string;
  /** At least one, at most 20. */
  locations: HotlineLocation[];
}

export interface LeadsApi {
  /** `POST /leads`. Unauthenticated: the landing page's contact form. */
  submit(input: LeadInput, opts?: Signal): Promise<void>;
  /** `POST /leads/hotline-report`. Unauthenticated: the "Chấm điểm hotline" page. */
  requestHotlineReport(input: HotlineReportInput, opts?: Signal): Promise<void>;
}

// ---------------------------------------------------------------------------
// The aggregate
// ---------------------------------------------------------------------------

export interface FonnusApi {
  auth: AuthApi;
  leads: LeadsApi;
}

/** The group names `NEXT_PUBLIC_API_LIVE_GROUPS` accepts. */
export const API_GROUPS = ['auth', 'leads'] as const;

export type ApiGroup = (typeof API_GROUPS)[number];
