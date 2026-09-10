"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { buildQuery } from "@/utils/url"

const DEBOUNCE_MS = 400

/**
 * The one search input. It lives in the navbar, so it is reachable from every
 * page, and it writes the term into the URL rather than into state.
 */
export default function SearchBar() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()

    const urlTitle = searchParams.get("title") ?? ""
    const [value, setValue] = useState(urlTitle)

    // the URL can change without this input being touched — the back button, a
    // click on the logo, a shared link. Adjusting state during render is the
    // documented way to follow a prop-like value; an effect would render the
    // stale term first and cause a second pass
    const [syncedTitle, setSyncedTitle] = useState(urlTitle)
    if (urlTitle !== syncedTitle) {
        setSyncedTitle(urlTitle)
        setValue(urlTitle)
    }

    // Debounce, or every keystroke fires a request. Worse than the load: the
    // responses can come back out of order, so the list ends up showing results
    // for "play" after the user has finished typing "playwright".
    useEffect(() => {
        // typing on a blog detail page should not yank the reader back to the
        // list; there the term only travels on submit
        if (pathname !== "/") return undefined
        if (value === urlTitle) return undefined

        const timer = setTimeout(() => {
            router.push(`/${buildQuery(searchParams, { title: value })}`)
        }, DEBOUNCE_MS)

        // a keystroke inside the window cancels the pending push, which is what
        // makes this a debounce rather than a queue of delayed requests
        return () => clearTimeout(timer)
    }, [value, urlTitle, pathname, router, searchParams])

    function handleSubmit(event) {
        event.preventDefault()
        router.push(`/${buildQuery(searchParams, { title: value })}`)
    }

    return (
        <form onSubmit={handleSubmit} className="min-w-0 flex-1" role="search">
            <input
                type="search"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Search blogs..."
                aria-label="Search blogs"
                className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
        </form>
    )
}
