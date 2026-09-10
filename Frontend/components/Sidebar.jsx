"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useAuth } from "@/contexts/AuthContext"

/**
 * Only routes that exist are listed. The rest of the menu arrives with the
 * page it points at, so nothing here ever leads to a 404:
 *   My Blogs      -> Phase 12  (/dashboard/blogs)
 *   Create Blog   -> Phase 11  (/dashboard/blogs/create)
 *   Profile       -> Phase 14  (/dashboard/profile)
 *   Change Password -> Phase 15 (/dashboard/change-password)
 */
const USER_LINKS = [{ href: "/dashboard", label: "Dashboard" }]

// admin-only. Hiding this is presentation, not protection: /admin/layout.jsx
// checks the role again, and the backend checks it a third time
const ADMIN_LINKS = [{ href: "/admin/users", label: "Users" }]

export default function Sidebar() {
    const { user } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    // a drawer that stays open after navigating covers the page the user just
    // asked for. Adjusting during render rather than in an effect: the drawer
    // closes in the same pass that shows the new route, with no frame where
    // both are on screen
    const [lastPathname, setLastPathname] = useState(pathname)
    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        setOpen(false)
    }

    const links = [...USER_LINKS, ...(user?.role === "admin" ? ADMIN_LINKS : [])]

    const item = (link) => {
        // startsWith so /dashboard/blogs/3/edit still marks My Blogs, but an
        // exact match for /dashboard itself, which is a prefix of every route
        const isActive =
            link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href)

        return (
            <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
                {link.label}
            </Link>
        )
    }

    return (
        <>
            {/* below md the sidebar is a drawer, so the page needs a way to
                open it; above md this button is not rendered at all */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mb-4 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 md:hidden"
                aria-expanded={open}
                aria-controls="dashboard-sidebar"
            >
                <span aria-hidden="true">☰</span> Menu
            </button>

            {open ? (
                <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-40 bg-black/40 md:hidden"
                />
            ) : null}

            <aside
                id="dashboard-sidebar"
                className={`fixed top-16 bottom-0 left-0 z-40 w-64 overflow-y-auto border-r border-gray-200 bg-white p-4 transition-transform md:sticky md:top-16 md:z-0 md:h-[calc(100vh-4rem)] md:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                    Menu
                </p>
                <nav className="space-y-1">{links.map(item)}</nav>
            </aside>
        </>
    )
}
