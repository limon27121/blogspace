"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import Avatar from "@/components/Avatar"
import { getBlogs } from "@/services/blog.service"
import { useAuth } from "@/contexts/AuthContext"
import { getDisplayName } from "@/utils/auth"
import { formatDate } from "@/utils/format"

const RECENT_LIMIT = 5

export default function DashboardHome() {
    const { user } = useAuth()
    // the layout guard renders nothing until the profile is loaded, so `user`
    // is never null by the time this component runs
    const [state, setState] = useState({ status: "loading", blogs: [], error: "" })

    // There is no stats endpoint. The count is derived from the blogs the API
    // returns, filtered by the signed-in id: deriving from real data is fine,
    // inventing a number is not. The backend has no userId query parameter, so
    // the filtering happens here.
    useEffect(() => {
        let cancelled = false

        getBlogs()
            .then((res) => {
                if (cancelled) return
                const rows = Array.isArray(res.data) ? res.data : []
                // author is a join and can be missing; userId is on the row
                // itself, so it is the reliable half of this comparison
                const mine = rows.filter((row) => (row.author?.id ?? row.userId) === user.id)
                setState({ status: "ready", blogs: mine, error: "" })
            })
            .catch((err) => {
                if (!cancelled) setState({ status: "error", blogs: [], error: err.message })
            })

        return () => {
            cancelled = true
        }
    }, [user.id])

    const recent = state.blogs.slice(0, RECENT_LIMIT)

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.firstname}
            </h1>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                    Here is what is happening with your account.
                </p>
                <Link
                    href="/dashboard/blogs/create"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Create Blog
                </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <p className="text-sm font-medium text-gray-500">Your blogs</p>
                    {state.status === "loading" ? (
                        <div className="mt-2 h-8 w-12 animate-pulse rounded bg-gray-200" />
                    ) : state.status === "error" ? (
                        <p className="mt-2 text-sm text-red-600">Unavailable</p>
                    ) : (
                        <p className="mt-1 text-3xl font-bold text-gray-900">
                            {state.blogs.length}
                        </p>
                    )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 sm:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Profile</p>
                    <div className="mt-3 flex items-center gap-4">
                        <Avatar person={user} size="lg" />
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">
                                {getDisplayName(user)}
                            </p>
                            <p className="truncate text-sm text-gray-600">{user.email}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                {/* role is text, never an input: §21 forbids any
                                    control over role or isActive anywhere */}
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
            </div>

            <section className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900">Recent blogs</h2>

                {state.status === "loading" ? (
                    <div className="mt-3 space-y-2">
                        {[0, 1, 2].map((row) => (
                            <div
                                key={row}
                                className="h-16 animate-pulse rounded-lg border border-gray-200 bg-white"
                            />
                        ))}
                    </div>
                ) : state.status === "error" ? (
                    <p
                        role="alert"
                        className="mt-3 rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700"
                    >
                        {state.error}
                    </p>
                ) : recent.length === 0 ? (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-8 text-center">
                        <p className="text-sm text-gray-600">
                            You have not created any blogs yet.
                        </p>
                        <Link
                            href="/dashboard/blogs/create"
                            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Write your first blog
                        </Link>
                    </div>
                ) : (
                    <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {recent.map((blog) => (
                            <li key={blog.id} className="flex items-center gap-4 px-5 py-4">
                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={`/blogs/${blog.id}`}
                                        className="block truncate font-medium text-gray-900 hover:text-blue-600"
                                    >
                                        {blog.blogTitle}
                                    </Link>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {blog.category} · {formatDate(blog.createAt)}
                                    </p>
                                </div>
                                <Link
                                    href={`/blogs/${blog.id}`}
                                    className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    View
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

            </section>
        </div>
    )
}
