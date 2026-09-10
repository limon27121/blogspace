"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import PasswordInput from "@/components/PasswordInput"
import { useAuth } from "@/contexts/AuthContext"
import { changePassword } from "@/services/user.service"

// long enough to read the message, short enough not to feel stuck
const REDIRECT_DELAY_MS = 1500

const MIN_PASSWORD_LENGTH = 6

export default function ChangePasswordPage() {
    const router = useRouter()
    const { logout } = useAuth()

    const [values, setValues] = useState({ password: "", confirmPassword: "" })
    const [errors, setErrors] = useState({})
    const [formError, setFormError] = useState("")
    const [notice, setNotice] = useState("")
    const [saving, setSaving] = useState(false)

    function handleChange(event) {
        const { name, value } = event.target
        setValues((current) => ({ ...current, [name]: value }))
        setErrors((current) => ({ ...current, [name]: "" }))
        setNotice("")
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (saving) return

        const found = {}
        if (!values.password) found.password = "New password is required."
        else if (values.password.length < MIN_PASSWORD_LENGTH) {
            found.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        }
        // the mismatch is caught here, so a typed-twice-differently password
        // never reaches the network at all
        if (!values.confirmPassword) found.confirmPassword = "Confirm the new password."
        else if (values.confirmPassword !== values.password) {
            found.confirmPassword = "Passwords do not match."
        }

        setErrors(found)
        setFormError("")
        setNotice("")
        if (Object.keys(found).length > 0) return

        setSaving(true)
        try {
            // the endpoint takes the new password and nothing else; the account
            // it belongs to comes from the token
            await changePassword(values.password)
            setNotice("Password updated. Signing you out - log in with your new password.")
            // the fields are cleared so the new password is not left sitting in
            // an input for the next person at this screen
            setValues({ password: "", confirmPassword: "" })

            // Signing out here proves the new password works before the session
            // ends, and leaves no screen behind that was opened with the old
            // one. It is a UX guarantee, not a security one: the backend
            // verifies only a token's signature and expiry, so a token issued
            // before the change stays valid elsewhere for up to a day. Killing
            // those would need a passwordChangedAt claim checked server-side.
            setTimeout(() => {
                logout()
                router.replace("/login")
            }, REDIRECT_DELAY_MS)
        } catch (err) {
            setFormError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-xl">
            <h1 className="text-2xl font-bold text-gray-900">Change password</h1>
            <p className="mt-1 text-sm text-gray-600">
                Choose a new password for your account.
            </p>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
                {notice ? (
                    <p
                        role="status"
                        className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
                    >
                        {notice}
                    </p>
                ) : null}

                {formError ? (
                    <p
                        role="alert"
                        className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                    >
                        {formError}
                    </p>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <PasswordInput
                        id="password"
                        name="password"
                        label="New password"
                        value={values.password}
                        onChange={handleChange}
                        error={errors.password}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                    />

                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Confirm new password"
                        value={values.confirmPassword}
                        onChange={handleChange}
                        error={errors.confirmPassword}
                        placeholder="Repeat the new password"
                        autoComplete="new-password"
                    />

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {saving ? "Updating..." : "Update password"}
                    </button>
                </form>

                {/* other devices are not signed out: the backend verifies only
                    a token's signature and expiry, so one issued before the
                    change keeps working until it expires. Saying so is better
                    than implying a reach this app does not have */}
                <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-500">
                    You will be signed out of this device and asked to log in again.
                    Sessions already open elsewhere keep working until they expire.
                </p>
            </div>
        </div>
    )
}
