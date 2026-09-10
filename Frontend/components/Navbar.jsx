"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import ProfileMenu from "@/components/ProfileMenu"
import { useAuth } from "@/contexts/AuthContext"

/**
 * Fixed top bar (§3). The layout compensates with matching top padding, or the
 * first row of every page sits underneath it.
 */
export default function Navbar() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [term, setTerm] = useState("")

    // Phase 5 replaces this with the debounced SearchBar that keeps the term in
    // the URL; submitting to the same query key means nothing has to change
    // here when it does
    function handleSearch(event) {
        event.preventDefault()
        const query = term.trim()
        router.push(query ? `/?title=${encodeURIComponent(query)}` : "/")
    }

    return (
        <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-gray-200 bg-white">
            <nav className="mx-auto flex h-full max-w-6xl items-center gap-4 px-4">
                <Link href="/" className="text-lg font-bold whitespace-nowrap text-blue-600">
                    Blog<span className="text-gray-900">Hub</span>
                </Link>

                <form onSubmit={handleSearch} className="min-w-0 flex-1" role="search">
                    <input
                        type="search"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Search blogs..."
                        aria-label="Search blogs"
                        className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                </form>

                {/* three states, not two: while the profile request is in
                    flight the visitor is neither known nor known-to-be-a-guest,
                    and showing Login for that moment flashes the wrong thing at
                    someone who is signed in */}
                {loading ? (
                    <div className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
                ) : user ? (
                    <ProfileMenu />
                ) : (
                    <div className="flex items-center gap-2">
                        <Link
                            href="/login"
                            className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Login
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Register
                        </Link>
                    </div>
                )}
            </nav>
        </header>
    )
}
