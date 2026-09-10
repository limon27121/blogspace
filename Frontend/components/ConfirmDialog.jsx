"use client"

import { useEffect, useRef } from "react"

/**
 * A modal confirmation. Rendered only while `open`, so there is no hidden
 * dialog sitting in the DOM that a test or a screen reader could still find.
 *
 * @param {{ open: boolean, title: string, message: string,
 *           confirmLabel?: string, cancelLabel?: string, pending?: boolean,
 *           onConfirm: () => void, onCancel: () => void }} props
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    pending = false,
    onConfirm,
    onCancel,
}) {
    const confirmRef = useRef(null)

    useEffect(() => {
        if (!open) return undefined

        // Escape has to cancel: a destructive dialog that can only be dismissed
        // by clicking one of two buttons invites the wrong one being clicked
        function onKeyDown(event) {
            if (event.key === "Escape" && !pending) onCancel()
        }
        document.addEventListener("keydown", onKeyDown)
        confirmRef.current?.focus()

        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, pending, onCancel])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label={cancelLabel}
                onClick={() => !pending && onCancel()}
                className="absolute inset-0 bg-black/50"
            />

            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
            >
                <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{message}</p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={pending}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        ref={confirmRef}
                        onClick={onConfirm}
                        disabled={pending}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                    >
                        {pending ? "Deleting..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
