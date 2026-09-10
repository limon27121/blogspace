"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import Loader from "@/components/Loader"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/contexts/AuthContext"

export default function DashboardLayout({ children }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // `!loading &&` is the whole trick. Redirecting on `!user` alone would
        // bounce a signed-in visitor to /login on every refresh, because `user`
        // is briefly null while the profile request is in flight.
        if (!loading && !user) router.replace("/login")
    }, [loading, user, router])

    if (loading) return <Loader label="Checking your session..." />
    // rendering children here for one frame would flash protected content on
    // screen before the redirect lands
    if (!user) return null

    return (
        <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
            <Sidebar />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    )
}
