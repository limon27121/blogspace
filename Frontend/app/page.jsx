"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import BlogCard from "@/components/BlogCard"
import CategoryFilter from "@/components/CategoryFilter"
import { BlogCardSkeletonGrid } from "@/components/Loader"
import { getBlogs } from "@/services/blog.service"

function HomeContent() {
    const searchParams = useSearchParams()
    const title = searchParams.get("title") ?? ""
    const category = searchParams.get("category") ?? ""

    // one string identifying the filter combination this render is asking for.
    // \u0000 cannot appear in a query value, so no pair of filters can collide
    const requestKey = `${title}\u0000${category}`
    const [result, setResult] = useState({ key: null, blogs: [], error: "" })

    useEffect(() => {
        let cancelled = false

        getBlogs({ title, category })
            .then((res) => {
                if (cancelled) return
                setResult({
                    key: requestKey,
                    blogs: Array.isArray(res.data) ? res.data : [],
                    error: "",
                })
            })
            .catch((err) => {
                // err.message is the backend's own wording (§31); apiFetch has
                // already replaced any raw JavaScript error with it
                if (!cancelled) setResult({ key: requestKey, blogs: [], error: err.message })
            })

        // the filters change while a request is in flight, so the response of
        // the query the user has already moved on from must not be rendered
        return () => {
            cancelled = true
        }
    }, [requestKey, title, category])

    // derived, not stored: the answer on screen belongs to some filter
    // combination, and if it is not this one the list is still loading. No
    // setState in the effect body, and no window where stale rows show as final
    const loading = result.key !== requestKey

    return (
        <div className="mx-auto max-w-6xl px-4 py-10">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Latest Blogs</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Testing, automation and engineering notes from the community.
                </p>
            </header>

            <div className="mb-8">
                <CategoryFilter />
            </div>

            {title || category ? (
                <p className="mb-4 text-sm text-gray-600">
                    {loading ? "Searching" : `${result.blogs.length} result${result.blogs.length === 1 ? "" : "s"}`}
                    {title ? (
                        <>
                            {" for "}
                            <span className="font-medium text-gray-900">{title}</span>
                        </>
                    ) : null}
                    {category ? (
                        <>
                            {" in "}
                            <span className="font-medium text-gray-900">{category}</span>
                        </>
                    ) : null}
                </p>
            ) : null}

            {loading ? (
                <BlogCardSkeletonGrid />
            ) : result.error ? (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
                >
                    <p className="font-medium text-red-700">{result.error}</p>
                    <p className="mt-1 text-sm text-red-600">
                        The blog service could not be reached. Try again in a moment.
                    </p>
                </div>
            ) : result.blogs.length === 0 ? (
                <p className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
                    No blogs found.
                </p>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {result.blogs.map((blog) => (
                        <BlogCard key={blog.id} blog={blog} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function Home() {
    // useSearchParams opts a route out of static rendering unless what uses it
    // sits behind a Suspense boundary; the fallback is the same skeleton the
    // page shows while its first request is in flight
    return (
        <Suspense
            fallback={
                <div className="mx-auto max-w-6xl px-4 py-10">
                    <BlogCardSkeletonGrid />
                </div>
            }
        >
            <HomeContent />
        </Suspense>
    )
}
