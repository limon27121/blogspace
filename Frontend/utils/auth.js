// One definition of where the token lives. Every other module goes through
// these three functions so the key name is never re-typed.

const TOKEN_KEY = "token"

// Each accessor guards on `window`: these modules are imported by client
// components, but Next still evaluates them on the server during the first
// render, where localStorage does not exist.

/** @returns {string|null} the stored bearer token, or null */
export function getToken() {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(TOKEN_KEY)
}

// --- name and avatar helpers -------------------------------------------
// `lastname` is nullable in the backend, so every one of these has to survive
// it being null, undefined or an empty string. Rendering "undefined" on screen
// is the failure these exist to prevent.

/**
 * @param {{firstname?: string, lastname?: string}} [person]
 * @returns {string} "Ada Lovelace", or "Ada" when there is no last name
 */
export function getDisplayName(person) {
    if (!person) return ""
    return [person.firstname, person.lastname].filter(Boolean).join(" ").trim()
}

/**
 * @param {{firstname?: string, lastname?: string}} [person]
 * @returns {string} up to two uppercase letters, "?" when there is no name
 */
export function getInitials(person) {
    const name = getDisplayName(person)
    if (!name) return "?"
    const parts = name.split(/\s+/)
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]
    return letters.toUpperCase()
}

// Fixed palette, picked by a hash of the name so the same person keeps the
// same colour on every page and across reloads. Full class strings, never
// built by string concatenation: Tailwind scans the source for literals and
// would not emit a class assembled at runtime.
const AVATAR_COLORS = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-sky-500",
    "bg-indigo-500",
    "bg-fuchsia-500",
]

/**
 * @param {{firstname?: string, lastname?: string}} [person]
 * @returns {string} a Tailwind background class
 */
export function getAvatarColor(person) {
    const name = getDisplayName(person)
    if (!name) return "bg-gray-400"
    let hash = 0
    for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) % 100000
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
