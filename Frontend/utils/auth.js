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
