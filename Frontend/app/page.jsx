"use client"

import { useEffect, useState } from "react"

import BlogCard from "@/components/BlogCard"
import { BlogCardSkeletonGrid } from "@/components/Loader"
import { getBlogs } from "@/services/blog.service"

export default function Home() {
    const [blogs, setBlogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // an empty dependency array is what keeps this to one request per load; a
    // missing one re-runs the fetch after every state update it causes
    useEffect(() => {
        let cancelled = false

        getBlogs()
            .then((res) => {
                if (cancelled) return
                // the envelope is { message, data }; data is an array here, but
                // a failed join or an unexpected shape must not crash .map
                setBlogs(Array.isArray(res.data) ? res.data : [])
                setError("")
            })
            .catch((err) => {
                // err.message is the backend's own wording (§31). A raw
                // JavaScript error never reaches the screen — apiFetch already
                // replaced it with the message from the response body
                if (!cancelled) setError(err.message)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Latest Blogs</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Testing, automation and engineering notes from the community.
                </p>
            </header>

            {/* three states, and they are exclusive: a spinner left on screen
                next to an error message reads as a page that is still trying */}
            {loading ? (
                <BlogCardSkeletonGrid />
            ) : error ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                >
                    <p className="font-medium text-red-700">{error}</p>
                    <p className="mt-1 text-sm text-red-600">
                        The blog service could not be reached. Try again in a moment.
                    </p>
                </div>
            ) : blogs.length === 0 ? (
                <p className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
                    No blogs found.
                </p>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {blogs.map((blog) => (
                        <BlogCard key={blog.id} blog={blog} />
                    ))}
                </div>
            )}
        </div>
    )
}
