"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { getBlogs } from "@/services/blog.service"
import { buildQuery } from "@/utils/url"

/**
 * The pills come from the blogs the API actually returns, not from a list
 * typed in here. `category` is a free-text column, so a hardcoded list goes
 * stale the moment someone publishes under a category that is not on it — and
 * every blog in a missing category becomes unreachable from the filter.
 *
 * There is no categories endpoint, so this derives them from `GET /api/blogs`,
 * the same way Phase 10 derives a blog count. Deriving from real API data is
 * fine; inventing the values is not.
 */
export default function CategoryFilter() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const active = searchParams.get("category") ?? ""

    const [categories, setCategories] = useState(null) // null while loading

    // deliberately unfiltered and run once: asking with the current filter
    // applied would return only blogs in the selected category, and the pill
    // list would collapse to the one that is already active
    useEffect(() => {
        let cancelled = false

        getBlogs()
            .then((res) => {
                if (cancelled) return
                const rows = Array.isArray(res.data) ? res.data : []
                const found = [...new Set(rows.map((row) => row.category).filter(Boolean))]
                setCategories(found.sort((a, b) => a.localeCompare(b)))
            })
            .catch(() => {
                // the list itself already renders the error; a second copy of it
                // above the pills would say the same thing twice
                if (!cancelled) setCategories([])
            })

        return () => {
            cancelled = true
        }
    }, [])

    function select(category) {
        // "All" is a label, never a value: sending category=All asks the backend
        // for a category literally named "All" and comes back empty
        const value = category === "All" ? "" : category
        router.push(`/${buildQuery(searchParams, { category: value })}`)
    }

    if (categories === null) {
        return (
            <div className="flex flex-wrap gap-2" aria-hidden="true">
                {[64, 88, 72, 96].map((width) => (
                    <div
                        key={width}
                        className="h-9 animate-pulse rounded-full bg-gray-200"
                        style={{ width }}
                    />
                ))}
            </div>
        )
    }

    // a category can arrive in the URL that no blog carries any more — a shared
    // link, or the last blog in it was deleted. Keep it in the row so the
    // active pill is visible and clickable rather than silently missing
    const shown = ["All", ...categories]
    if (active && !shown.includes(active)) shown.push(active)

    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {shown.map((category) => {
                const isActive = category === "All" ? active === "" : active === category

                return (
                    <button
                        key={category}
                        type="button"
                        onClick={() => select(category)}
                        aria-pressed={isActive}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                            isActive
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600"
                        }`}
                    >
                        {category}
                    </button>
                )
            })}
        </div>
    )
}
