"use client"

import { useEffect, useState } from "react"

import Avatar from "@/components/Avatar"
import { getUserById, getUsers, setUserStatus } from "@/services/user.service"
import { useAuth } from "@/contexts/AuthContext"
import { getDisplayName } from "@/utils/auth"
import { formatDate } from "@/utils/format"

function StatusBadge({ isActive }) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
        >
            {isActive ? "Active" : "Inactive"}
        </span>
    )
}

export default function AdminUsersPage() {
    const { user: me } = useAuth()

    const [state, setState] = useState({ status: "loading", users: [], error: "" })
    const [busyId, setBusyId] = useState(null) // the row whose request is in flight
    const [notice, setNotice] = useState("")
    const [actionError, setActionError] = useState("")
    const [detail, setDetail] = useState(null) // { status, user, error }

    useEffect(() => {
        let cancelled = false

        getUsers()
            .then((res) => {
                if (!cancelled) {
                    setState({
                        status: "ready",
                        users: Array.isArray(res.data) ? res.data : [],
                        error: "",
                    })
                }
            })
            .catch((err) => {
                if (!cancelled) setState({ status: "error", users: [], error: err.message })
            })

        return () => {
            cancelled = true
        }
    }, [])

    async function toggleStatus(row) {
        setBusyId(row.id)
        setNotice("")
        setActionError("")
        try {
            const res = await setUserStatus(row.id, !row.isActive)
            // §29: update the row from the response, with no full reload. The
            // server's own row is what goes back into state, so the screen
            // cannot drift from what was actually stored
            const updated = res.data ?? { ...row, isActive: !row.isActive }
            setState((current) => ({
                ...current,
                users: current.users.map((item) => (item.id === row.id ? { ...item, ...updated } : item)),
            }))
            setNotice(res.message)
            // a detail panel open on this user should not keep showing the old
            // status behind the table
            setDetail((current) =>
                current?.user?.id === row.id
                    ? { ...current, user: { ...current.user, ...updated } }
                    : current,
            )
        } catch (err) {
            // "an admin cannot change their own status", or a 403 if the role
            // changed underneath this page
            setActionError(err.message)
        } finally {
            setBusyId(null)
        }
    }

    async function openDetail(row) {
        // the list already carries most of this, but §28 asks for the record
        // fetched by id - and it is the only way to see fields the list omits
        setDetail({ status: "loading", user: row, error: "" })
        try {
            const res = await getUserById(row.id)
            setDetail({ status: "ready", user: res.data, error: "" })
        } catch (err) {
            setDetail({ status: "error", user: row, error: err.message })
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-600">
                Every account on the site. Deactivating one blocks it from logging in.
            </p>

            {notice ? (
                <p
                    role="status"
                    className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
                >
                    {notice}
                </p>
            ) : null}

            {actionError ? (
                <p
                    role="alert"
                    className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                    {actionError}
                </p>
            ) : null}

            {state.status === "loading" ? (
                <div className="mt-6 space-y-2">
                    {[0, 1, 2, 3].map((row) => (
                        <div
                            key={row}
                            className="h-14 animate-pulse rounded-lg border border-gray-200 bg-white"
                        />
                    ))}
                </div>
            ) : state.status === "error" ? (
                <p
                    role="alert"
                    className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700"
                >
                    {state.error}
                </p>
            ) : state.users.length === 0 ? (
                <p className="mt-6 rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-600">
                    No users found.
                </p>
            ) : (
                <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                            <tr>
                                <th scope="col" className="px-5 py-3">User</th>
                                <th scope="col" className="px-5 py-3">Email</th>
                                <th scope="col" className="px-5 py-3">Role</th>
                                <th scope="col" className="px-5 py-3">Status</th>
                                <th scope="col" className="px-5 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {state.users.map((row) => {
                                const isSelf = row.id === me.id
                                return (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar person={row} size="sm" />
                                                <span className="font-medium text-gray-900">
                                                    {getDisplayName(row) || "Unnamed user"}
                                                </span>
                                                {isSelf ? (
                                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                        You
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">{row.email}</td>
                                        <td className="px-5 py-3 text-gray-600 capitalize">{row.role}</td>
                                        <td className="px-5 py-3">
                                            <StatusBadge isActive={row.isActive} />
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetail(row)}
                                                    aria-label={`View ${row.email}`}
                                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                >
                                                    View
                                                </button>
                                                {/* the backend refuses an admin changing their
                                                    own status, so the row that would fail does
                                                    not offer the button */}
                                                {isSelf ? null : (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatus(row)}
                                                        disabled={busyId === row.id}
                                                        aria-label={`${row.isActive ? "Deactivate" : "Activate"} ${row.email}`}
                                                        className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                                                            row.isActive
                                                                ? "border border-red-200 text-red-600 hover:bg-red-50"
                                                                : "border border-green-200 text-green-700 hover:bg-green-50"
                                                        }`}
                                                    >
                                                        {busyId === row.id
                                                            ? "Saving..."
                                                            : row.isActive
                                                              ? "Deactivate"
                                                              : "Activate"}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {detail ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setDetail(null)}
                        className="absolute inset-0 bg-black/50"
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="user-detail-title"
                        className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
                    >
                        <h2 id="user-detail-title" className="text-lg font-semibold text-gray-900">
                            User details
                        </h2>

                        {detail.status === "error" ? (
                            <p role="alert" className="mt-4 text-sm font-medium text-red-700">
                                {detail.error}
                            </p>
                        ) : (
                            <>
                                <div className="mt-4 flex items-center gap-4">
                                    <Avatar person={detail.user} size="lg" />
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-gray-900">
                                            {getDisplayName(detail.user) || "Unnamed user"}
                                        </p>
                                        <p className="truncate text-sm text-gray-600">
                                            {detail.user.email}
                                        </p>
                                    </div>
                                </div>

                                <dl className="mt-5 space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Role</dt>
                                        <dd className="font-medium text-gray-900 capitalize">
                                            {detail.user.role}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-gray-500">Status</dt>
                                        <dd>
                                            <StatusBadge isActive={detail.user.isActive} />
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Profile image</dt>
                                        {/* §28 asks for it, but `users` has no image
                                            column: the backend cannot store one until
                                            Phase 17. Saying so beats showing a
                                            placeholder that pretends to be a photo */}
                                        <dd className="text-right text-gray-600">
                                            Not available yet
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-gray-500">Created</dt>
                                        <dd className="font-medium text-gray-900">
                                            {formatDate(detail.user.createAt) || "Unknown"}
                                        </dd>
                                    </div>
                                </dl>
                            </>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setDetail(null)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
