"use client"

import { useEffect, useRef, useState } from "react"

import Avatar from "@/components/Avatar"
import { updateProfileImage } from "@/services/user.service"
import { useAuth } from "@/contexts/AuthContext"

// mirrors the backend exactly. Checking here saves a round trip and gives a
// clearer message; the backend checks again, and it reads the file's own bytes
// rather than trusting the type the browser reports (§39)
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export default function ProfileImageUpload() {
    const { user, refreshUser } = useAuth()
    const inputRef = useRef(null)

    const [file, setFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState("")
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")
    const [uploading, setUploading] = useState(false)

    // an object URL is a live handle into browser memory; without this it is
    // held until the tab closes
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    function clearSelection() {
        setFile(null)
        setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return ""
        })
        // without this, choosing the same file again fires no change event
        if (inputRef.current) inputRef.current.value = ""
    }

    function handleChoose(event) {
        const chosen = event.target.files?.[0]
        setError("")
        setNotice("")
        if (!chosen) return clearSelection()

        if (!ALLOWED_TYPES.includes(chosen.type)) {
            setError("Choose a JPEG, PNG, WebP or GIF image.")
            return clearSelection()
        }

        if (chosen.size > MAX_BYTES) {
            const megabytes = (chosen.size / (1024 * 1024)).toFixed(1)
            setError(`That image is ${megabytes} MB. The limit is 2 MB.`)
            return clearSelection()
        }

        setFile(chosen)
        setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return URL.createObjectURL(chosen)
        })
    }

    async function handleUpload() {
        if (!file || uploading) return

        setUploading(true)
        setError("")
        setNotice("")
        try {
            await updateProfileImage(file)
            // §22: the profile avatar and the fixed navbar avatar both read the
            // context, so one refresh updates both with no re-login
            await refreshUser()
            setNotice("Profile image updated.")
            clearSelection()
        } catch (err) {
            // the backend's own wording, including its refusal of a file that
            // is not really an image whatever it is named
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Profile image</h2>
            <p className="mt-1 text-sm text-gray-600">
                JPEG, PNG, WebP or GIF, up to 2 MB.
            </p>

            {notice ? (
                <p
                    role="status"
                    className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
                >
                    {notice}
                </p>
            ) : null}

            {error ? (
                <p
                    role="alert"
                    className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                    {error}
                </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-5">
                <Avatar person={user} size="lg" previewUrl={previewUrl} />

                <div className="flex flex-wrap items-center gap-3">
                    {/* a bare file input cannot be styled, so the real one is
                        hidden and the label is what the user clicks */}
                    <input
                        ref={inputRef}
                        id="profile-image"
                        name="image"
                        type="file"
                        accept={ALLOWED_TYPES.join(",")}
                        onChange={handleChoose}
                        className="sr-only"
                    />
                    <label
                        htmlFor="profile-image"
                        className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Choose Image
                    </label>

                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        {uploading ? "Uploading..." : "Upload"}
                    </button>

                    {file ? (
                        <button
                            type="button"
                            onClick={() => {
                                clearSelection()
                                setError("")
                            }}
                            disabled={uploading}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    ) : null}
                </div>
            </div>

            {file ? (
                <p className="mt-3 truncate text-xs text-gray-500">
                    Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB) — not uploaded yet.
                </p>
            ) : null}
        </div>
    )
}
