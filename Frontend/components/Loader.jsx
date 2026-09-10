/** Centred spinner for a whole page or panel. */
export default function Loader({ label = "Loading..." }) {
    return (
        <div
            className="flex items-center justify-center gap-3 py-16 text-gray-500"
            role="status"
        >
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <span className="text-sm">{label}</span>
        </div>
    )
}

/**
 * One placeholder card. A skeleton is used instead of a spinner wherever a
 * list is loading (§32) so the page does not jump when the real cards land.
 */
export function BlogCardSkeleton() {
    return (
        <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-5">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-5 w-3/4 rounded bg-gray-200" />
            <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-gray-200" />
                <div className="h-3 w-5/6 rounded bg-gray-200" />
            </div>
            <div className="mt-5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div className="h-3 w-32 rounded bg-gray-200" />
            </div>
        </div>
    )
}

/** @param {{count?: number}} props */
export function BlogCardSkeletonGrid({ count = 6 }) {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }, (unused, i) => (
                <BlogCardSkeleton key={i} />
            ))}
        </div>
    )
}
