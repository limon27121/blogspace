import Link from "next/link"

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-gray-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-gray-500 sm:flex-row">
                <p>
                    <span className="font-semibold text-gray-700">BlogHub</span> — Blog
                    Management Application
                </p>
                <nav className="flex gap-4">
                    <Link href="/" className="hover:text-blue-600">
                        Home
                    </Link>
                    <Link href="/login" className="hover:text-blue-600">
                        Login
                    </Link>
                    <Link href="/register" className="hover:text-blue-600">
                        Register
                    </Link>
                </nav>
            </div>
        </footer>
    )
}
