"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import Avatar from "@/components/Avatar"
import { getBlogById } from "@/services/blog.service"
import { getDisplayName } from "@/utils/auth"
import { formatDate } from "@/utils/format"

export default function BlogDetailPage() {
    // the route is a client component because the rest of the app is: auth is a
    // bearer token in the browser, so useParams is how the id arrives here
    const { id } = useParams()

    const [state, setState] = useState({ status: "loading", blog: null, error: "", code: 0 })

    useEffect(() => {
        let cancelled = false

        getBlogById(id)
            .then((res) => {
                if (!cancelled) setState({ status: "ready", blog: res.data, error: "", code: 200 })
            })
            .catch((err) => {
                // 404 gets its own page; every other failure renders the
                // backend's own wording — "blog id must be a positive integer"
                // for /blogs/abc, or the unreachable-API message
                if (!cancelled) {
                    setState({ status: "error", blog: null, error: err.message, code: err.status })
                }
            })

        return () => {
            cancelled = true
        }
    }, [id])

    if (state.status === "loading") {
        return (
            <div className="mx-auto max-w-3xl animate-pulse px-4 py-10">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="mt-4 h-8 w-3/4 rounded bg-gray-200" />
                <div className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="h-3 w-40 rounded bg-gray-200" />
                </div>
                <div className="mt-8 space-y-3">
                    {[100, 96, 92, 98, 60].map((width) => (
                        <div key={width} className="h-3 rounded bg-gray-200" style={{ width: `${width}%` }} />
                    ))}
                </div>
            </div>
        )
    }

    if (state.status === "error") {
        const notFound = state.code === 404

        return (
            <div className="mx-auto max-w-3xl px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    {notFound ? "Blog Not Found" : "This blog could not be loaded"}
                </h1>
                <p className="mt-3 text-gray-600" role="alert">
                    {notFound
                        ? "The blog you are looking for does not exist or has been removed."
                        : state.error}
                </p>
                <Link
                    href="/"
                    className="mt-8 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Back to all blogs
                </Link>
            </div>
        )
    }

    const blog = state.blog
    const author = blog.author
    const authorName = getDisplayName(author) || "Unknown author"

    return (
        <article className="mx-auto max-w-3xl px-4 py-10">
            <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                &larr; Back to all blogs
            </Link>

            <span className="mt-6 block w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {blog.category}
            </span>

            <h1 className="mt-3 text-3xl leading-tight font-bold text-gray-900">
                {blog.blogTitle}
            </h1>

            <div className="mt-6 flex items-center gap-3 border-b border-gray-200 pb-6">
                <Avatar person={author} size="md" />
                <div>
                    <p className="text-sm font-medium text-gray-800">{authorName}</p>
                    <p className="text-xs text-gray-500">{formatDate(blog.createAt)}</p>
                </div>
            </div>

            {/* the body is plain text from a TEXT column, never HTML: rendering
                it with dangerouslySetInnerHTML would let any author inject a
                script into every reader's page. whitespace-pre-line keeps the
                author's own line breaks */}
            <div className="mt-8 leading-relaxed whitespace-pre-line text-gray-800">
                {blog.blog}
            </div>
        </article>
    )
}
