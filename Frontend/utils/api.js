// The only place in the app that talks HTTP. Pages and components never call
// fetch directly: page -> component -> service -> apiFetch.

import { getToken } from "@/utils/auth"

const BASE = process.env.NEXT_PUBLIC_API_URL

/**
 * @param {string} path      path after the base url, e.g. "/blogs/3"
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {object|FormData} [options.body]
 * @param {boolean} [options.auth=true]  attach the bearer token when one exists
 * @returns {Promise<{message: string, data?: any, token?: string}>}
 * @throws {Error & {status: number}} on any non-2xx response
 */
export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
    const headers = {}

    // getToken returns null on the server, where localStorage does not exist
    const token = auth ? getToken() : null

    if (token) headers.Authorization = `Bearer ${token}`

    // FormData sets its own multipart boundary — setting Content-Type by hand
    // breaks the upload
    const isForm = typeof FormData !== "undefined" && body instanceof FormData
    if (body && !isForm) headers["Content-Type"] = "application/json"

    let res
    try {
        res = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: isForm ? body : body ? JSON.stringify(body) : undefined,
        })
    } catch {
        // the request never reached the server: API down, wrong port, DNS, or
        // the browser blocked it. fetch throws a TypeError whose message is
        // raw JavaScript ("Failed to fetch"), and §31 says that must never be
        // rendered — replace it with something a reader can act on
        const offline = new Error(
            "Cannot reach the server. Make sure the API is running.",
        )
        offline.status = 0 // no HTTP status exists for a request never sent
        throw offline
    }

    // an error body is still JSON, but a 500 behind a dead proxy may not be,
    // so a parse failure must not replace the real status with a syntax error
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
        // fetch does not throw on 404 or 500 by itself. Throwing here is what
        // lets every caller use try/catch instead of checking res.ok again.
        // The backend's own wording is what the user should read.
        const error = new Error(json.message || "Something went wrong")
        error.status = res.status
        throw error
    }

    return json // { message, data } — the caller picks what it needs
}
