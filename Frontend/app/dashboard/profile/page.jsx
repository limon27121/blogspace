"use client"

import { useState } from "react"

import Avatar from "@/components/Avatar"
import { updateProfile } from "@/services/user.service"
import { useAuth } from "@/contexts/AuthContext"
import { getDisplayName } from "@/utils/auth"
import { formatDate } from "@/utils/format"

export default function ProfilePage() {
    // the layout guard has already loaded the profile, so this page edits what
    // the context holds rather than fetching the same row a second time
    const { user, refreshUser } = useAuth()

    const [values, setValues] = useState({
        firstname: user.firstname ?? "",
        lastname: user.lastname ?? "",
    })
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

        // lastname stays optional: the column is nullable, and the backend
        // turns an empty one back into null
        const found = {}
        if (!values.firstname.trim()) found.firstname = "First name is required."
        setErrors(found)
        setFormError("")
        setNotice("")
        if (Object.keys(found).length > 0) return

        setSaving(true)
        try {
            // firstname and lastname only. Sending role or isActive would be
            // refused with a 403 by the backend, and §21 forbids offering them
            // at all
            await updateProfile({
                firstname: values.firstname.trim(),
                lastname: values.lastname.trim(),
            })
            // the navbar and the dashboard read the same context, so they show
            // the new name without a re-login (§20)
            await refreshUser()
            setNotice("Profile updated.")
        } catch (err) {
            setFormError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const field =
        "w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
    const ok = "border-gray-300 focus:border-blue-500"
    const bad = "border-red-400 focus:border-red-500"

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="mt-1 text-sm text-gray-600">Your account details.</p>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-5">
                    <Avatar person={user} size="lg" />
                    <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-gray-900">
                            {getDisplayName(user)}
                        </p>
                        <p className="truncate text-sm text-gray-600">{user.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {/* role and status are read-only text. The moment
                                either becomes a control, §21 and §42 are broken
                                even if the backend rejects the change */}
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 capitalize">
                                {user.role}
                            </span>
                            <span
                                className={`rounded-full px-2 py-0.5 font-medium ${
                                    user.isActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                            >
                                {user.isActive ? "Active" : "Inactive"}
                            </span>
                            {user.createAt ? (
                                <span className="text-gray-500">
                                    Joined {formatDate(user.createAt)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Your name is what other readers see on your blogs.
                </p>

                {notice ? (
                    <p
                        role="status"
                        className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
                    >
                        {notice}
                    </p>
                ) : null}

                {formError ? (
                    <p
                        role="alert"
                        className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                    >
                        {formError}
                    </p>
                ) : null}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
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
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        {/* read-only (§21). The backend would accept an email
                            change through this endpoint, but the assignment
                            does not ask for it and a changed login address is
                            not something to offer by accident */}
                        <input
                            id="email"
                            name="email"
                            value={user.email}
                            readOnly
                            disabled
                            className={`mt-1 ${field} cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500`}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Your email address cannot be changed here.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </form>
            </div>
        </div>
    )
}
