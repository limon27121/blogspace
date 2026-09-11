import {
    register_user,
    login_user,
    request_password_reset,
    reset_password,
} from "../Services/auth.service.js";
import { send_password_reset_email } from "../Services/mailer.service.js";
import { send_error } from "../middlewares/error.middleware.js";

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        // destructured field by field on purpose. passing req.body straight
        // through would let a caller send { "role": "admin", "isActive": true }
        // and set columns they must not control
        const { firstname, lastname, email, password } = req.body

        const user = await register_user({ firstname, lastname, email, password })

        res.status(201).json({
            message: "user registered successfully",
            data: user,
        })
    } catch (error) {
        send_error(res, error)
    }
}

// POST /api/auth/login
export const log_in = async (req, res) => {
    try {
        const { email, password } = req.body

        const { token, user } = await login_user({ email, password })

        res.status(200).json({
            message: "login successful",
            token,
            data: user,
        })
    } catch (error) {
        send_error(res, error)
    }
}

// POST /api/auth/forgot-password
export const forgot_password = async (req, res) => {
    try {
        const { email } = req.body

        const result = await request_password_reset({ email })

        if (result) {
            // the link points at the frontend, which is where the form lives.
            // The backend only owns the token
            const base = process.env.FRONTEND_URL || "http://localhost:3000"
            const resetUrl = `${base}/reset-password/${result.token}`

            // awaited so a slow mail server does not let the response claim
            // more than happened, but it never throws
            await send_password_reset_email({ to: result.user.email, resetUrl })
        }

        // the same answer whether or not the address is registered: a different
        // one would let anyone enumerate accounts
        res.status(200).json({
            message: "if that email is registered, a reset link has been sent",
        })
    } catch (error) {
        send_error(res, error)
    }
}

// PATCH /api/auth/reset-password/:token
// public: the token in the url is the credential, which is the whole point of
// this endpoint - the caller cannot log in
export const reset_password_with_token = async (req, res) => {
    try {
        const { password } = req.body

        const { id } = await reset_password({
            token: req.params.token,
            password,
        })

        res.status(200).json({
            message: "password reset successfully",
            data: { id },
        })
    } catch (error) {
        send_error(res, error)
    }
}
