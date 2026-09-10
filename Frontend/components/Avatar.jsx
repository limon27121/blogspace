import { getAvatarColor, getDisplayName, getInitials } from "@/utils/auth"

const SIZES = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-20 w-20 text-2xl",
}

/**
 * Initials on a coloured circle. The backend has no image column yet
 * (Phase 17), so there is nothing to fall back from — this is the avatar.
 *
 * @param {{ person?: {firstname?: string, lastname?: string},
 *           size?: "sm"|"md"|"lg" }} props
 */
export default function Avatar({ person, size = "md" }) {
    const name = getDisplayName(person)

    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none ${getAvatarColor(person)} ${SIZES[size] ?? SIZES.md}`}
            // the initials are decoration; the name is already written next to
            // it in every place this is used, so the label carries the meaning
            // for a screen reader without reading two letters aloud
            aria-label={name || "User"}
            title={name || undefined}
        >
            {getInitials(person)}
        </span>
    )
}
