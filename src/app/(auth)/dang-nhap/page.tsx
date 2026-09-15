import type { Metadata } from 'next'
import { SignInPage } from '@/auth/sign-in-page'
import { SignInPanel } from '@/auth/sign-in-panel'

export const metadata: Metadata = { title: 'Đăng nhập' }

/**
 * The panel is built here, in a server component, and handed to the client
 * screen as a prop — fixed copy that never reaches the browser bundle.
 */
export default function Page() {
  return <SignInPage panel={<SignInPanel />} />
}
