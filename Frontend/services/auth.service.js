import { apiFetch } from "@/utils/api"

// Both endpoints are public: a guest has no token yet, so auth: false keeps
// apiFetch from sending a stale one from a previous session.

/**
 * POST /api/auth/register
 * Exactly four keys. Never send role or isActive — the backend decides both.
 * @returns {Promise<{message: string, data: object}>}
 */
export const register = ({ firstname, lastname, email, password }) =>
    apiFetch("/auth/register", {
        method: "POST",
        body: { firstname, lastname, email, password },
        auth: false,
    })

/**
 * POST /api/auth/login
 * @returns {Promise<{message: string, token: string, data: object}>}
 *          the token lives at the top level here, not inside data
 */
export const login = ({ email, password }) =>
    apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
    })

/**
 * POST /api/auth/forgot-password — public.
 *
 * The reply is deliberately the same whether or not the address is registered,
 * so nothing here can be used to find out which emails exist. The token never
 * comes back in the response; it travels by email.
 *
 * @param {string} email
 * @returns {Promise<{message: string}>}
 */
export const forgotPassword = (email) =>
    apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
    })
