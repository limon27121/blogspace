import Link from "next/link"

import Avatar from "@/components/Avatar"
import { getDisplayName } from "@/utils/auth"
import { formatDate, truncate } from "@/utils/format"

/**
 * One blog in the public list.
 *
 * @param {{ blog: { id: number, blogTitle: string, blog: string,
 *                   category: string, createAt: string,
 *                   author?: { id: number, firstname: string, lastname: string|null } } }} props
 */
export default function BlogCard({ blog }) {
    // author is a join on the backend side; a row whose user was removed would
    // arrive without it, and reading .firstname off undefined kills the whole list
    const author = blog.author
    const authorName = getDisplayName(author) || "Unknown author"

    return (
        <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md">
            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {blog.category}
            </span>

            <h2 className="mt-3 line-clamp-2 text-lg font-semibold text-gray-900">
                <Link href={`/blogs/${blog.id}`} className="hover:text-blue-600">
                    {blog.blogTitle}
                </Link>
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {truncate(blog.blog)}
            </p>

            {/* mt-auto pins this row to the bottom, so cards of different text
                lengths still line their footers up across the grid */}
            <div className="mt-auto flex items-center gap-3 pt-5">
                <Avatar person={author} size="sm" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{authorName}</p>
                    <p className="text-xs text-gray-500">{formatDate(blog.createAt)}</p>
                </div>
                <Link
                    href={`/blogs/${blog.id}`}
                    className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    Read More
                </Link>
            </div>
        </article>
    )
}
