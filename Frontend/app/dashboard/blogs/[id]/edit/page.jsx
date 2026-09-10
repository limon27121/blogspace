"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import BlogForm from "@/components/BlogForm"
import { getBlogById, updateBlog } from "@/services/blog.service"
import { useAuth } from "@/contexts/AuthContext"

export default function EditBlogPage() {
    const { id } = useParams()
    const router = useRouter()
    const { user } = useAuth()

    const [state, setState] = useState({ status: "loading", blog: null, error: "", code: 0 })
    const [formError, setFormError] = useState("")

    useEffect(() => {
        let cancelled = false

        getBlogById(id)
            .then((res) => {
                if (!cancelled) setState({ status: "ready", blog: res.data, error: "", code: 200 })
            })
            .catch((err) => {
                if (!cancelled) {
                    setState({ status: "error", blog: null, error: err.message, code: err.status })
                }
            })

        return () => {
            cancelled = true
        }
    }, [id])

    async function handleSubmit(values) {
        setFormError("")
        try {
            await updateBlog(id, values)
            router.push("/dashboard/blogs")
        } catch (err) {
            // 403 "You are not authorized to update this blog." for someone
            // else's, or a 400 from the backend's own field validation
            setFormError(err.message)
            throw err // lets BlogForm re-enable its button
        }
    }

    if (state.status === "loading") {
        return (
            <div className="max-w-3xl animate-pulse">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-4 h-8 w-1/2 rounded bg-gray-200" />
                <div className="mt-6 h-96 rounded-lg bg-gray-200" />
            </div>
        )
    }

    if (state.status === "error") {
        const notFound = state.code === 404
        return (
            <div className="max-w-lg py-16 text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    {notFound ? "Blog Not Found" : "This blog could not be loaded"}
                </h1>
                <p className="mt-3 text-gray-600" role="alert">
                    {notFound
                        ? "It does not exist, or it has already been deleted."
                        : state.error}
                </p>
                <Link
                    href="/dashboard/blogs"
                    className="mt-8 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Back to my blogs
                </Link>
            </div>
        )
    }

    const blog = state.blog
    // GET /api/blogs/:id is public, so this page loads for anyone. The write is
    // what is protected: the backend answers 403 unless the blog is yours or
    // you are an admin. Saying so up front is a courtesy; the refusal below
    // still comes from the backend, in its own words.
    const canEdit = (blog.author?.id ?? blog.userId) === user.id || user.role === "admin"

    return (
        <div className="max-w-3xl">
            <Link
                href="/dashboard/blogs"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
                &larr; Back to my blogs
            </Link>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">Edit blog</h1>
            <p className="mt-1 text-sm text-gray-600">
                Changes appear on the public page as soon as you save.
            </p>

            {!canEdit ? (
                <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    This blog belongs to another author. Saving it will be refused.
                </p>
            ) : null}

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
                <BlogForm
                    // the form initialises its fields once, so it is only
                    // rendered after the blog has arrived
                    initialValues={{
                        blogTitle: blog.blogTitle ?? "",
                        blog: blog.blog ?? "",
                        category: blog.category ?? "",
                    }}
                    onSubmit={handleSubmit}
                    submitLabel="Save changes"
                    pendingLabel="Saving..."
                    formError={formError}
                />
            </div>
        </div>
    )
}
