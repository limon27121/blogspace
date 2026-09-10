"use client"

import { Suspense } from "react"
import Link from "next/link"

import ProfileMenu from "@/components/ProfileMenu"
import SearchBar from "@/components/SearchBar"
import { useAuth } from "@/contexts/AuthContext"

/**
 * Fixed top bar (§3). The layout compensates with matching top padding, or the
 * first row of every page sits underneath it.
 */
export default function Navbar() {
    const { user, loading } = useAuth()

    return (
        <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-gray-200 bg-white">
            <nav className="mx-auto flex h-full max-w-6xl items-center gap-4 px-4">
                <Link href="/" className="text-lg font-bold whitespace-nowrap text-blue-600">
                    Blog<span className="text-gray-900">Hub</span>
                </Link>

                {/* Suspense because SearchBar reads the URL with
                    useSearchParams, and the navbar renders on every route */}
                <Suspense
                    fallback={<div className="h-9 min-w-0 flex-1 rounded-full bg-gray-100" />}
                >
                    <SearchBar />
                </Suspense>

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
