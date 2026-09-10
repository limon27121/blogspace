import { apiFetch } from "@/utils/api"

// Every route under /api/users requires a token, so none of these pass
// auth: false. The self-service ones carry no id: the backend picks the row
// from the token.

/** GET /api/users/profile — the logged-in user's own record */
export const getProfile = () => apiFetch("/users/profile")

/**
 * PUT /api/users/profile/update
 * Only firstname and lastname are editable. The backend answers 403 if the
 * body so much as mentions role, isActive or id, so send nothing else.
 */
export const updateProfile = ({ firstname, lastname }) =>
    apiFetch("/users/profile/update", {
        method: "PUT",
        body: { firstname, lastname },
    })

/** PATCH /api/users/password — new password only, no current-password field */
export const changePassword = (password) =>
    apiFetch("/users/password", { method: "PATCH", body: { password } })

/**
 * GET /api/users — admin only. Supports page and limit; empty values are
 * dropped so the url stays clean when the caller passes nothing.
 */
export const getUsers = (params = {}) => {
    const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v),
    ).toString()
    return apiFetch(`/users${query ? `?${query}` : ""}`)
}

/** GET /api/users/:id — admin only */
export const getUserById = (id) => apiFetch(`/users/${id}`)

/**
 * PATCH /api/users/:id/status — admin only
 * @param {boolean} isActive true activates, false deactivates
 */
export const setUserStatus = (id, isActive) =>
    apiFetch(`/users/${id}/status`, { method: "PATCH", body: { isActive } })
