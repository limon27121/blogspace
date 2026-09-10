"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import BlogForm from "@/components/BlogForm"
import { createBlog } from "@/services/blog.service"

export default function CreateBlogPage() {
    const router = useRouter()
    const [formError, setFormError] = useState("")

    async function handleSubmit(values) {
        setFormError("")
        try {
            await createBlog(values)
            router.push("/dashboard/blogs")
        } catch (err) {
            // the backend's own wording, e.g. "blogTitle cannot be empty"
            setFormError(err.message)
            throw err // the form re-enables its button on a rejected submit
        }
    }

    return (
        <div className="max-w-3xl">
            <Link
                href="/dashboard/blogs"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
                &larr; Back to my blogs
            </Link>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">Create a blog</h1>
            <p className="mt-1 text-sm text-gray-600">
                It appears on the public homepage as soon as you publish.
            </p>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
                <BlogForm onSubmit={handleSubmit} formError={formError} />
            </div>
        </div>
    )
}
