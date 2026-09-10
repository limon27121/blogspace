"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import Loader from "@/components/Loader"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/contexts/AuthContext"

export default function AdminLayout({ children }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // a guest is sent to log in; a signed-in non-admin is not, because
        // logging in again would change nothing for them
        if (!loading && !user) router.replace("/login")
    }, [loading, user, router])

    if (loading) return <Loader label="Checking your session..." />
    if (!user) return null

    if (user.role !== "admin") {
        // this is a message, not the protection. The backend rejects the same
        // request with 403 whatever this component renders, and hiding the
        // sidebar link would not have stopped a typed URL either
        return (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                <p className="mt-3 text-gray-600">
                    This area is for administrators. Your account does not have that role.
                </p>
                <Link
                    href="/dashboard"
                    className="mt-8 inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Back to dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
            <Sidebar />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    )
}
