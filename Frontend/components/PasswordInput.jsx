"use client"

import { useState } from "react"

/**
 * Password field with a show/hide toggle. Shared by register, login and the
 * change-password form, so the three behave identically.
 *
 * @param {{ id: string, name: string, label: string, value: string,
 *           onChange: (event: Event) => void, error?: string,
 *           placeholder?: string, autoComplete?: string }} props
 */
export default function PasswordInput({
    id,
    name,
    label,
    value,
    onChange,
    error,
    placeholder,
    autoComplete = "off",
}) {
    const [visible, setVisible] = useState(false)

    const base =
        "w-full rounded-md border px-3 py-2 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
    const border = error
        ? "border-red-400 focus:border-red-500"
        : "border-gray-300 focus:border-blue-500"

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                {label}
            </label>

            <div className="relative mt-1">
                <input
                    id={id}
                    name={name}
                    // the toggle only changes what is on screen; the value in
                    // state is the same either way, and nothing about the
                    // request changes
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={`${base} ${border}`}
                />

                <button
                    type="button" // never submit: this button lives inside a form
                    onClick={() => setVisible((current) => !current)}
                    // the label says what the click will do, not what the state
                    // is, which is what a screen reader user needs to hear
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    tabIndex={-1} // Tab should go to the next field, not here
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                    {visible ? (
                        // open eye with a slash: currently visible, click to hide
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                            aria-hidden="true"
                        >
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                            <path d="M9.4 5.2A9.7 9.7 0 0112 5c5 0 9 4.5 10 7a13.4 13.4 0 01-3.2 4.2M6.2 6.6C3.9 8.1 2.4 10.3 2 12c1 2.5 5 7 10 7a9.6 9.6 0 004.1-.9" />
                        </svg>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                            aria-hidden="true"
                        >
                            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            </div>

            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    )
}
