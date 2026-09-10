"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import PasswordInput from "@/components/PasswordInput"
import { register } from "@/services/auth.service"

const MIN_PASSWORD_LENGTH = 6
// deliberately loose: the browser is not the place to decide an address is
// undeliverable, only to catch the obvious typo before a request goes out
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EMPTY = { firstname: "", lastname: "", email: "", password: "", confirmPassword: "" }

/**
 * Everything here is checked in the browser before the request leaves, so a
 * typo never costs a round trip. The backend checks the same things again:
 * client validation is a convenience, never the enforcement.
 */
function validate(values) {
    const errors = {}

    if (!values.firstname.trim()) errors.firstname = "First name is required."
    // lastname is intentionally absent: the column is nullable, and every
    // component already renders a user who has none

    if (!values.email.trim()) errors.email = "Email is required."
    else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter a valid email address."

    if (!values.password) errors.password = "Password is required."
    else if (values.password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }

    if (!values.confirmPassword) errors.confirmPassword = "Confirm your password."
    else if (values.confirmPassword !== values.password) {
        errors.confirmPassword = "Passwords do not match."
    }

    return errors
}

export default function RegisterPage() {
    const router = useRouter()
    const [values, setValues] = useState(EMPTY)
    const [errors, setErrors] = useState({})
    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    function handleChange(event) {
        const { name, value } = event.target
        setValues((current) => ({ ...current, [name]: value }))
        // clear the message for the field being corrected, so the form stops
        // shouting about something the user is already fixing
        setErrors((current) => ({ ...current, [name]: "" }))
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return // a second click before the first request lands

        const found = validate(values)
        setErrors(found)
        setFormError("")
        if (Object.keys(found).length > 0) return // nothing is sent

        setSubmitting(true)
        try {
            // exactly four keys. No role, no isActive, no confirmPassword: the
            // confirmation is a browser-only check (§42)
            await register({
                firstname: values.firstname.trim(),
                lastname: values.lastname.trim(),
                email: values.email.trim(),
                password: values.password,
            })
            router.push("/login")
        } catch (err) {
            // the backend's own wording, "email already registered" included
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
                <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
                <p className="mt-1 text-sm text-gray-600">Publish your own blogs on BlogHub.</p>

                {formError ? (
                    <p
                        role="alert"
                        className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                    >
                        {formError}
                    </p>
                ) : null}

                {/* noValidate: the browser's own validation bubbles fire before
                    this form can show its messages, and they cannot be styled
                    or asserted on */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="firstname"
                                className="block text-sm font-medium text-gray-700"
                            >
                                First name
                            </label>
                            <input
                                id="firstname"
                                name="firstname"
                                value={values.firstname}
                                onChange={handleChange}
                                className={`mt-1 ${field} ${errors.firstname ? bad : ok}`}
                                placeholder="Ada"
                            />
                            {errors.firstname ? (
                                <p className="mt-1 text-xs text-red-600">{errors.firstname}</p>
                            ) : null}
                        </div>

                        <div>
                            <label
                                htmlFor="lastname"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Last name <span className="text-gray-400">(optional)</span>
                            </label>
                            <input
                                id="lastname"
                                name="lastname"
                                value={values.lastname}
                                onChange={handleChange}
                                className={`mt-1 ${field} ${ok}`}
                                placeholder="Lovelace"
                            />
                        </div>
                    </div>

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
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                    />

                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Confirm password"
                        value={values.confirmPassword}
                        onChange={handleChange}
                        error={errors.confirmPassword}
                        placeholder="Repeat the password"
                        autoComplete="new-password"
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {submitting ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}
