"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import ConfirmDialog from "@/components/ConfirmDialog"
import { deleteBlog, getBlogs } from "@/services/blog.service"
import { useAuth } from "@/contexts/AuthContext"
import { getDisplayName } from "@/utils/auth"
import { formatDate } from "@/utils/format"

export default function ManageBlogsPage() {
    const { user } = useAuth()
    const isAdmin = user.role === "admin"

    const [state, setState] = useState({ status: "loading", blogs: [], error: "" })
    const [target, setTarget] = useState(null) // the blog awaiting confirmation
    const [deleting, setDeleting] = useState(false)
    const [notice, setNotice] = useState("")
    const [actionError, setActionError] = useState("")

    // The backend has no userId query parameter, so a normal user's own blogs
    // are filtered here. An admin sees every blog (§4).
    const fetchRows = useCallback(
        () =>
            getBlogs().then((res) => {
                const rows = Array.isArray(res.data) ? res.data : []
                // author is a join and can be missing; userId is on the row itself
                return isAdmin ? rows : rows.filter((row) => (row.author?.id ?? row.userId) === user.id)
            }),
        [isAdmin, user.id],
    )

    // setState lives in the promise callbacks, never in the effect body: React
    // treats a synchronous setState there as a cascading render
    const load = useCallback(
        () =>
            fetchRows()
                .then((blogs) => setState({ status: "ready", blogs, error: "" }))
                .catch((err) => setState({ status: "error", blogs: [], error: err.message })),
        [fetchRows],
    )

    useEffect(() => {
        let cancelled = false

        fetchRows()
            .then((blogs) => {
                if (!cancelled) setState({ status: "ready", blogs, error: "" })
            })
            .catch((err) => {
                if (!cancelled) setState({ status: "error", blogs: [], error: err.message })
            })

        return () => {
            cancelled = true
        }
    }, [fetchRows])

    async function handleDelete() {
        if (!target) return

        setDeleting(true)
        setActionError("")
        try {
            await deleteBlog(target.id)
            setNotice(`"${target.blogTitle}" was deleted.`)
            setTarget(null)
            // re-read rather than splice the row out locally: the list then
            // reflects what the server holds, not what this page assumed
            await load()
        } catch (err) {
            // 403 for someone else's blog, 404 if it is already gone
            setActionError(err.message)
            setTarget(null)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isAdmin ? "All Blogs" : "My Blogs"}
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        {isAdmin
                            ? "Every blog on the site. As an administrator you can delete any of them."
                            : "The blogs you have published."}
                    </p>
                </div>
                <Link
                    href="/dashboard/blogs/create"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Create Blog
                </Link>
            </div>

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
            ) : state.blogs.length === 0 ? (
                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-10 text-center">
                    <p className="text-sm text-gray-600">
                        {isAdmin ? "No blogs found." : "You haven't created any blogs yet."}
                    </p>
                    <Link
                        href="/dashboard/blogs/create"
                        className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Create your first blog
                    </Link>
                </div>
            ) : (
                // the wrapper scrolls, not the page: a wide table must never
                // push the whole layout sideways on a phone (§34)
                <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                            <tr>
                                <th scope="col" className="px-5 py-3">Title</th>
                                <th scope="col" className="px-5 py-3">Category</th>
                                <th scope="col" className="px-5 py-3">Author</th>
                                <th scope="col" className="px-5 py-3">Created</th>
                                <th scope="col" className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {state.blogs.map((blog) => (
                                <tr key={blog.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-3">
                                        <Link
                                            href={`/blogs/${blog.id}`}
                                            className="font-medium text-gray-900 hover:text-blue-600"
                                        >
                                            {blog.blogTitle}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">{blog.category}</td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {getDisplayName(blog.author) || "Unknown author"}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">
                                        {formatDate(blog.createAt)}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                        <Link
                                            href={`/dashboard/blogs/${blog.id}/edit`}
                                            aria-label={`Edit ${blog.blogTitle}`}
                                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNotice("")
                                                setActionError("")
                                                setTarget(blog)
                                            }}
                                            aria-label={`Delete ${blog.blogTitle}`}
                                            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={target !== null}
                title="Delete this blog?"
                message={
                    target
                        ? `"${target.blogTitle}" will be removed permanently. This cannot be undone.`
                        : ""
                }
                confirmLabel="Delete"
                pending={deleting}
                onConfirm={handleDelete}
                onCancel={() => setTarget(null)}
            />
        </div>
    )
}
