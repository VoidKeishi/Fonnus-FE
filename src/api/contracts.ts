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
 * Only the `auth` group exists today. The other five groups of the contract —
 * tenant, assistant, receptionist, voice, leads — arrive with the screens that
 * call them (PLAN.md); nothing ships ahead of its first consumer.
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
// The aggregate
// ---------------------------------------------------------------------------

export interface FonnusApi {
  auth: AuthApi;
}

/** The group names `NEXT_PUBLIC_API_LIVE_GROUPS` accepts. */
export const API_GROUPS = ['auth'] as const;

export type ApiGroup = (typeof API_GROUPS)[number];
