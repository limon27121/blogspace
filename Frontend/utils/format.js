// Shared formatting. Phase 4 needs it for the card, Phase 6 for the detail
// page and Phase 12 for the table, so it does not live inside a component.

/**
 * The backend renamed its timestamp columns: the field is `createAt`, not
 * `createdAt`. Reading the wrong one gives `Invalid Date` on every card.
 *
 * @param {string} value ISO timestamp from the API
 * @returns {string} "12 Mar 2025", or "" when the value is missing or unparsable
 */
export function formatDate(value) {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    // an explicit locale, not the visitor's: the list is rendered on the client
    // after a fetch, and a machine-dependent format makes a rendered page
    // impossible to assert on
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date)
}

/**
 * Cut a long body down to a preview. The backend has no short field, so the
 * card trims the full text itself rather than asking for a second shape.
 *
 * @param {string} text
 * @param {number} [limit=160]
 * @returns {string} text cut at the last whole word before the limit, with an ellipsis
 */
export function truncate(text, limit = 160) {
    if (typeof text !== "string") return ""
    const clean = text.trim()
    if (clean.length <= limit) return clean

    const cut = clean.slice(0, limit)
    const lastSpace = cut.lastIndexOf(" ")
    // a word boundary only if there is one worth using: a single long token
    // would otherwise collapse the preview to nothing
    return `${lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut}...`
}
