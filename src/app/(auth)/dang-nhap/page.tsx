import type { Metadata } from 'next'
import { SignInPage } from '@/features/auth/sign-in-page'
import { SignInPanel } from '@/features/auth/sign-in-panel'

export const metadata: Metadata = { title: 'Đăng nhập', alternates: { canonical: '/dang-nhap' } }

/**
 * The panel is built here, in a server component, and handed to the client
 * screen as a prop — fixed copy that never reaches the browser bundle.
 */
export default function Page() {
  return <SignInPage panel={<SignInPanel />} />
}
