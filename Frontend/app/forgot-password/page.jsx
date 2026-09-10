"use client"

import { useState } from "react"
import Link from "next/link"

import { forgotPassword } from "@/services/auth.service"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [fieldError, setFieldError] = useState("")
    const [formError, setFormError] = useState("")
    const [sentTo, setSentTo] = useState("")
    const [sending, setSending] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        if (sending) return

        const trimmed = email.trim()
        if (!trimmed) {
            setFieldError("Email is required.")
            return
        }
        if (!EMAIL_PATTERN.test(trimmed)) {
            setFieldError("Enter a valid email address.")
            return
        }

        setFieldError("")
        setFormError("")
        setSending(true)
        try {
            await forgotPassword(trimmed)
            // The backend answers the same way for an address it does not know,
            // so this screen must not claim more than that. Saying "we sent it"
            // outright would tell a stranger the address is registered.
            setSentTo(trimmed)
        } catch (err) {
            setFormError(err.message)
        } finally {
            setSending(false)
        }
    }

    if (sentTo) {
        return (
            <div className="mx-auto max-w-md px-4 py-12">
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
                    <p className="mt-3 text-sm text-gray-600">
                        If <span className="font-medium text-gray-900">{sentTo}</span> belongs to
                        an account, a link to choose a new password is on its way. It is valid for
                        one hour.
                    </p>
                    <p className="mt-3 text-sm text-gray-600">
                        Nothing has changed on the account yet — the old password still works
                        until a new one is set.
                    </p>

                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href="/login"
                            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Back to login
                        </Link>
                        <button
                            type="button"
                            onClick={() => setSentTo("")}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                            Use a different email
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-md px-4 py-12">
            <div className="rounded-lg border border-gray-200 bg-white p-8">
                <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Enter the email you signed up with and we will send a link to reset it.
                </p>

                {formError ? (
                    <p
                        role="alert"
                        className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                    >
                        {formError}
                    </p>
                ) : null}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value)
                                setFieldError("")
                            }}
                            autoComplete="email"
                            placeholder="you@example.com"
                            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none ${
                                fieldError
                                    ? "border-red-400 focus:border-red-500"
                                    : "border-gray-300 focus:border-blue-500"
                            }`}
                        />
                        {fieldError ? (
                            <p className="mt-1 text-xs text-red-600">{fieldError}</p>
                        ) : null}
                    </div>

                    <button
                        type="submit"
                        disabled={sending}
                        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {sending ? "Sending..." : "Send reset link"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Remembered it?{" "}
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                        Back to login
                    </Link>
                </p>
            </div>
        </div>
    )
}
