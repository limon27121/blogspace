"use client"

import { useEffect, useState } from "react"

import { getBlogs } from "@/services/blog.service"

const EMPTY = { blogTitle: "", blog: "", category: "" }

function validate(values) {
    const errors = {}
    if (!values.blogTitle.trim()) errors.blogTitle = "Title is required."
    if (!values.category.trim()) errors.category = "Category is required."
    if (!values.blog.trim()) errors.blog = "Content is required."
    return errors
}

/**
 * Shared by create (Phase 11) and edit (Phase 13). It owns the fields and the
 * browser-side validation; the page owns what happens on submit, so the same
 * form can POST or PUT without knowing which.
 *
 * @param {{ initialValues?: {blogTitle: string, blog: string, category: string},
 *           onSubmit: (values: object) => Promise<void>,
 *           submitLabel?: string, pendingLabel?: string, formError?: string }} props
 */
export default function BlogForm({
    initialValues = EMPTY,
    onSubmit,
    submitLabel = "Publish",
    pendingLabel = "Publishing...",
    formError = "",
}) {
    const [values, setValues] = useState(initialValues)
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [categories, setCategories] = useState([])

    // suggestions only. `category` is a free-text column with no endpoint
    // listing its values, so the existing ones are pulled from the blogs
    // themselves - and a new category can still be typed in
    useEffect(() => {
        let cancelled = false

        getBlogs()
            .then((res) => {
                if (cancelled) return
                const rows = Array.isArray(res.data) ? res.data : []
                setCategories([...new Set(rows.map((row) => row.category).filter(Boolean))].sort())
            })
            .catch(() => {
                // the field still works without suggestions, and the page has
                // its own error area for anything that matters
                if (!cancelled) setCategories([])
            })

        return () => {
            cancelled = true
        }
    }, [])

    function handleChange(event) {
        const { name, value } = event.target
        setValues((current) => ({ ...current, [name]: value }))
        setErrors((current) => ({ ...current, [name]: "" }))
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return // one request per submit, however fast the clicks

        const found = validate(values)
        setErrors(found)
        if (Object.keys(found).length > 0) return

        setSubmitting(true)
        try {
            // trimmed, and exactly the three keys the backend takes. No userId:
            // the owner comes from the token (§42)
            await onSubmit({
                blogTitle: values.blogTitle.trim(),
                blog: values.blog.trim(),
                category: values.category.trim(),
            })
        } finally {
            // on success the page navigates away and this never runs; on
            // failure the button has to come back
            setSubmitting(false)
        }
    }

    const field =
        "w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
    const ok = "border-gray-300 focus:border-blue-500"
    const bad = "border-red-400 focus:border-red-500"

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError ? (
                <p
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                    {formError}
                </p>
            ) : null}

            <div>
                <label htmlFor="blogTitle" className="block text-sm font-medium text-gray-700">
                    Title
                </label>
                <input
                    id="blogTitle"
                    name="blogTitle"
                    value={values.blogTitle}
                    onChange={handleChange}
                    className={`mt-1 ${field} ${errors.blogTitle ? bad : ok}`}
                    placeholder="What is this blog about?"
                />
                {errors.blogTitle ? (
                    <p className="mt-1 text-xs text-red-600">{errors.blogTitle}</p>
                ) : null}
            </div>

            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                </label>
                <input
                    id="category"
                    name="category"
                    list="blog-categories"
                    value={values.category}
                    onChange={handleChange}
                    className={`mt-1 ${field} ${errors.category ? bad : ok}`}
                    placeholder="Testing, DevOps, ..."
                />
                <datalist id="blog-categories">
                    {categories.map((category) => (
                        <option key={category} value={category} />
                    ))}
                </datalist>
                {errors.category ? (
                    <p className="mt-1 text-xs text-red-600">{errors.category}</p>
                ) : (
                    <p className="mt-1 text-xs text-gray-500">
                        Pick an existing category or type a new one.
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="blog" className="block text-sm font-medium text-gray-700">
                    Content
                </label>
                <textarea
                    id="blog"
                    name="blog"
                    rows={12}
                    value={values.blog}
                    onChange={handleChange}
                    className={`mt-1 ${field} ${errors.blog ? bad : ok}`}
                    placeholder="Write your blog here..."
                />
                {errors.blog ? <p className="mt-1 text-xs text-red-600">{errors.blog}</p> : null}
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
            >
                {submitting ? pendingLabel : submitLabel}
            </button>
        </form>
    )
}
