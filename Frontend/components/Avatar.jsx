"use client"

import { useState } from "react"

import { getAvatarColor, getDisplayName, getInitials } from "@/utils/auth"
import { imageUrl } from "@/utils/url"

const SIZES = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-20 w-20 text-2xl",
}

/**
 * The uploaded picture when there is one, initials on a coloured circle when
 * there is not. Most accounts have no image, so the initials are the normal
 * case rather than a fallback for a failure.
 *
 * @param {{ person?: {firstname?: string, lastname?: string, image?: string|null},
 *           size?: "sm"|"md"|"lg",
 *           previewUrl?: string }} props  previewUrl shows a locally chosen file
 *                                        before it has been uploaded
 */
export default function Avatar({ person, size = "md", previewUrl }) {
    const name = getDisplayName(person)
    const dimensions = SIZES[size] ?? SIZES.md
    const source = previewUrl || imageUrl(person?.image)

    // a stored path can outlive its file - the row survives, the upload folder
    // is wiped, the backend moves - and a broken image icon is worse than the
    // initials this component already knows how to draw
    const [failed, setFailed] = useState(false)

    if (source && !failed) {
        return (
            // a plain img, not next/image: the optimiser would need the API
            // host declared in next.config and adds a proxy hop, and these are
            // 32-80px avatars served from the same machine
            <img
                src={source}
                alt={name ? `${name}'s profile picture` : "Profile picture"}
                onError={() => setFailed(true)}
                className={`inline-block shrink-0 rounded-full bg-gray-100 object-cover ${dimensions}`}
            />
        )
    }

    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none ${getAvatarColor(person)} ${dimensions}`}
            // the initials are decoration; the name is written next to it
            // everywhere this is used, so the label carries the meaning without
            // reading two letters aloud
            aria-label={name || "User"}
            title={name || undefined}
        >
            {getInitials(person)}
        </span>
    )
}
