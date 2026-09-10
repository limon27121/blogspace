import { apiFetch } from "@/utils/api"

/**
 * GET /api/blogs — public, so auth: false. Filters are title and category;
 * a blank one is dropped, and "All" must never be sent as a category or the
 * backend looks for a category literally named "All" and returns nothing.
 * @param {{title?: string, category?: string}} [params]
 */
export const getBlogs = (params = {}) => {
    const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v), // drop empty title/category
    ).toString()
    return apiFetch(`/blogs${query ? `?${query}` : ""}`, { auth: false })
}

/** GET /api/blogs/:id — public. Throws 404 with "blog not found". */
export const getBlogById = (id) => apiFetch(`/blogs/${id}`, { auth: false })

/**
 * POST /api/blogs/create
 * Exactly three keys. No userId — the owner comes from the token.
 */
export const createBlog = ({ blogTitle, blog, category }) =>
    apiFetch("/blogs/create", {
        method: "POST",
        body: { blogTitle, blog, category },
    })

/** PUT /api/blogs/update/:id — 403 unless the blog is yours or you are admin */
export const updateBlog = (id, { blogTitle, blog, category }) =>
    apiFetch(`/blogs/update/${id}`, {
        method: "PUT",
        body: { blogTitle, blog, category },
    })

/** DELETE /api/blogs/delete/:id — the path the submission table names */
export const deleteBlog = (id) =>
    apiFetch(`/blogs/delete/${id}`, { method: "DELETE" })
