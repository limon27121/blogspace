"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import Avatar from "@/components/Avatar"
import { useAuth } from "@/contexts/AuthContext"
import { getDisplayName } from "@/utils/auth"

/**
 * Avatar + name + dropdown for a signed-in user.
 *
 * Only items whose page exists are listed: Change Password arrives in Phase 15,
 * and a menu item pointing at a 404 is worse than no item.
 */
export default function ProfileMenu() {
    const { user, logout } = useAuth()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)

    // a dropdown that only closes on its own button stays open behind the next
    // thing the user clicks, so close on any outside click and on Escape
    useEffect(() => {
        if (!open) return undefined

        function onPointerDown(event) {
            if (!containerRef.current?.contains(event.target)) setOpen(false)
        }
        function onKeyDown(event) {
            if (event.key === "Escape") setOpen(false)
        }

        document.addEventListener("mousedown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("mousedown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [open])

    if (!user) return null

    function handleLogout() {
        setOpen(false)
        logout()
        router.replace("/login")
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <Avatar person={user} size="sm" />
                <span className="hidden max-w-32 truncate text-sm font-medium text-gray-700 sm:block">
                    {getDisplayName(user)}
                </span>
            </button>

            {open && (
                <div
                    className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    role="menu"
                >
                    <div className="border-b border-gray-100 px-4 py-3">
                        <p className="truncate text-sm font-medium text-gray-900">
                            {getDisplayName(user)}
                        </p>
                        <p className="truncate text-xs text-gray-500">{user.email}</p>
                        <p className="mt-1 text-xs text-gray-400 capitalize">{user.role}</p>
                    </div>
                    <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                    >
                        Dashboard
                    </Link>

                    <Link
                        href="/dashboard/profile"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                    >
                        Profile
                    </Link>

                    {user.role === "admin" ? (
                        <Link
                            href="/admin/users"
                            onClick={() => setOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                        >
                            Users
                        </Link>
                    ) : null}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        role="menuitem"
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    )
}
