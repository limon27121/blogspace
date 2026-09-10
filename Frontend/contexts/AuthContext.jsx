"use client"

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"

import { login as loginRequest } from "@/services/auth.service"
import { getProfile } from "@/services/user.service"
import { clearToken, getToken, setToken } from "@/utils/auth"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // localStorage survives a refresh, React state does not. On mount the app
    // holds a token but no user, so the profile has to be fetched before any
    // guard is allowed to decide the visitor is logged out.
    useEffect(() => {
        let cancelled = false
        const token = getToken()

        // Promise.resolve keeps the no-token path asynchronous as well:
        // setting state straight from the effect body cascades an extra render
        const load = token
            ? getProfile().then((res) => res.data)
            : Promise.resolve(null)

        load
            .catch(() => {
                // expired, tampered with, or the account was deactivated: a
                // token the backend refuses is worse than none, so drop it
                clearToken()
                return null
            })
            .then((profile) => {
                // React mounts effects twice in development; without this the
                // second response can land after unmount and write dead state
                if (cancelled) return
                setUser(profile)
                setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [])

    /**
     * Store the token, then load the profile so `user` holds the same shape
     * everywhere — the login response and GET /users/profile are not
     * guaranteed to carry the same fields.
     * Errors are re-thrown: the login page renders `error.message`.
     */
    const login = useCallback(async (email, password) => {
        const res = await loginRequest({ email, password })
        setToken(res.token)

        try {
            const profile = await getProfile()
            setUser(profile.data)
            return profile.data
        } catch (error) {
            // the token was accepted at login but not on the next call, so it
            // is not usable — do not leave a half-logged-in session behind
            clearToken()
            setUser(null)
            throw error
        }
    }, [])

    const logout = useCallback(() => {
        clearToken()
        setUser(null)
    }, [])

    /** Re-read the profile without a re-login (Phase 14 and 16 need it). */
    const refreshUser = useCallback(async () => {
        const res = await getProfile()
        setUser(res.data)
        return res.data
    }, [])

    // a fresh object every render would re-render every consumer on every
    // parent render, guards included
    const value = useMemo(
        () => ({ user, loading, login, logout, refreshUser }),
        [user, loading, login, logout, refreshUser],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * @returns {{user: object|null, loading: boolean, login: Function,
 *            logout: Function, refreshUser: Function}}
 */
export function useAuth() {
    const context = useContext(AuthContext)
    // reading auth outside the provider returns undefined and fails later in a
    // guard, far from the cause — fail here instead
    if (!context) throw new Error("useAuth must be used inside an AuthProvider")
    return context
}
