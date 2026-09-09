import { register_user, login_user } from "../Services/auth.service.js";
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
