/**
 * Build the query string for a filter change, keeping every other filter that
 * is already in the URL.
 *
 * The filters live in the URL, not in component state: that makes a filtered
 * list shareable, survives a refresh, and makes the back button behave.
 *
 * @param {URLSearchParams} current  from `useSearchParams()`
 * @param {Record<string, string>} changes  a falsy value removes the key
 * @returns {string} "?title=play&category=Testing", or "" when nothing is set
 */
export function buildQuery(current, changes) {
    const next = new URLSearchParams(current)

    for (const [key, value] of Object.entries(changes)) {
        const clean = typeof value === "string" ? value.trim() : ""
        // an empty parameter is not the same as an absent one: ?title= asks the
        // backend to filter on an empty title, so the key is dropped instead
        if (clean) next.set(key, clean)
        else next.delete(key)
    }

    const query = next.toString()
    return query ? `?${query}` : ""
}

/**
 * Turn a stored image path into something an `<img src>` can load.
 *
 * The backend stores `/uploads/user-3-17.png`, which is relative to **its own**
 * host, not to Next. `NEXT_PUBLIC_API_URL` points at `.../api`, so the origin
 * is that minus the trailing `/api`.
 *
 * @param {string|null|undefined} storedPath
 * @returns {string} an absolute url, or "" when there is no image
 */
export function imageUrl(storedPath) {
    if (!storedPath) return ""

    // already absolute (a seeded row, or a CDN one day): leave it alone
    if (/^https?:\/\//i.test(storedPath)) return storedPath

    const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "")
    return `${base}${storedPath.startsWith("/") ? "" : "/"}${storedPath}`
}
