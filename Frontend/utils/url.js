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
