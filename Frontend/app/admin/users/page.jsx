"use client"

/**
 * Shell only. Phase 16 builds the real table: GET /api/users, the detail view,
 * and activate/deactivate. It exists now because /admin/layout.jsx cannot run
 * its role check on a route that does not resolve to a page - Next would render
 * its own 404 instead, outside this layout, and a non-admin would see that
 * rather than Access Denied.
 */
export default function AdminUsersPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-600">Administrator area.</p>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-600">
                    The user list and activate/deactivate controls arrive in the next steps.
                </p>
            </div>
        </div>
    )
}
