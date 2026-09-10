"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import PasswordInput from "@/components/PasswordInput"
import { useAuth } from "@/contexts/AuthContext"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
    const router = useRouter()
    // the context owns the token and the profile: doing it here would leave
    // the navbar and every guard reading stale state
    const { login } = useAuth()

    const [values, setValues] = useState({ email: "", password: "" })
    const [errors, setErrors] = useState({})
    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    function handleChange(event) {
        const { name, value } = event.target
        setValues((current) => ({ ...current, [name]: value }))
        setErrors((current) => ({ ...current, [name]: "" }))
    }

    function validate() {
        const found = {}
        if (!values.email.trim()) found.email = "Email is required."
        else if (!EMAIL_PATTERN.test(values.email.trim())) {
            found.email = "Enter a valid email address."
        }
        if (!values.password) found.password = "Password is required."
        return found
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return // double-click guard: one request, not two

        const found = validate()
        setErrors(found)
        setFormError("")
        if (Object.keys(found).length > 0) return

        setSubmitting(true)
        try {
            await login(values.email.trim(), values.password)
            // replace, not push: Back from the dashboard should not land on a
            // login form the user has already passed
            router.replace("/dashboard")
        } catch (err) {
            // the backend's own wording: "invalid email or password" for both a
            // wrong password and an unknown email, and "this account has been
            // deactivated" for a disabled one
            setFormError(err.message)
            setSubmitting(false)
        }
    }

    const field =
        "w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
    const ok = "border-gray-300 focus:border-blue-500"
    const bad = "border-red-400 focus:border-red-500"

    return (
        <div className="mx-auto max-w-md px-4 py-12">
            <div className="rounded-lg border border-gray-200 bg-white p-8">
                <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                <p className="mt-1 text-sm text-gray-600">Log in to manage your blogs.</p>

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
                            value={values.email}
                            onChange={handleChange}
                            autoComplete="email"
                            className={`mt-1 ${field} ${errors.email ? bad : ok}`}
                            placeholder="you@example.com"
                        />
                        {errors.email ? (
                            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                        ) : null}
                    </div>

                    <PasswordInput
                        id="password"
                        name="password"
                        label="Password"
                        value={values.password}
                        onChange={handleChange}
                        error={errors.password}
                        placeholder="Your password"
                        autoComplete="current-password"
                    />

                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {submitting ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    New here?{" "}
                    <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    )
}
