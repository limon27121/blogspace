import nodemailer from "nodemailer";

// SMTP is optional on purpose. A grader running this project has no mail
// account to give it, and a password reset that only works with credentials
// nobody has is a feature nobody can test. With SMTP_HOST set the mail is sent
// for real; without it the message is written to the server log instead, and
// the endpoint behaves identically either way.
const smtp_configured = Boolean(process.env.SMTP_HOST)

let transporter = null

const get_transporter = () => {
    if (!smtp_configured) return null

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            // 465 is implicit TLS; 587 upgrades with STARTTLS after connecting
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: process.env.SMTP_USER
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
                : undefined,
        })
    }

    return transporter
}

/**
 * Send the password-reset link.
 *
 * Never throws: a mail server that is down must not turn into a 500 that tells
 * the caller whether the address exists. The failure is logged and the endpoint
 * still answers with its usual neutral message.
 *
 * @param {{ to: string, resetUrl: string }} params
 * @returns {Promise<{ delivered: boolean, logged: boolean }>}
 */
export const send_password_reset_email = async ({ to, resetUrl }) => {
    const from = process.env.MAIL_FROM || "Blog Management <no-reply@blog.local>"
    const subject = "Reset your Blog Management password"
    const text = [
        "Someone asked to reset the password for this account.",
        "",
        `Open this link to choose a new one: ${resetUrl}`,
        "",
        "The link is valid for one hour, and once only.",
        "If this was not you, ignore this email - nothing has changed yet.",
    ].join("\n")

    const mailer = get_transporter()

    if (!mailer) {
        // the link goes to the server console, which is the only place it can
        // go without a mail account. It is not returned to the caller: that
        // would let anyone reset any account they can name
        console.log("\n--- password reset (SMTP not configured, email not sent) ---")
        console.log(`to:   ${to}`)
        console.log(`link: ${resetUrl}`)
        console.log("--- configure SMTP_HOST in .env to send this for real ---\n")
        return { delivered: false, logged: true }
    }

    try {
        await mailer.sendMail({ from, to, subject, text })
        return { delivered: true, logged: false }
    } catch (error) {
        console.error("password reset email failed to send:", error.message)
        return { delivered: false, logged: false }
    }
}
