import Link from "next/link"

/**
 * Placeholder, on purpose.
 *
 * §25 asks for a password reset, but the backend has no
 * `POST /api/auth/forgot-password` — no reset-token column and no mail sender.
 * §1 forbids mocking an endpoint, so this page says what is true instead of
 * showing a "check your inbox" message for an email nobody sent.
 *
 * Phase 17 replaces this with the real form once the backend has the endpoint.
 */
export default function ForgotPasswordPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-12">
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Password reset</h1>
                <p className="mt-3 text-sm text-gray-600">
                    This feature is not available yet. The API has no password-reset
                    endpoint, so there is nothing here that could send you a reset link.
                </p>
                <p className="mt-3 text-sm text-gray-600">
                    Ask an administrator to help you get back into your account.
                </p>
                <Link
                    href="/login"
                    className="mt-8 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Back to login
                </Link>
            </div>
        </div>
    )
}
