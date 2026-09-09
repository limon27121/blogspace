import {
    list_users,
    get_user,
    get_profile,
    update_profile,
    update_password,
    set_user_status,
} from "../Services/user.service.js";
import { send_error } from "../middlewares/error.middleware.js";

// GET /api/users  (admin)
export const get_users = async (req, res) => {
    try {
        const { page, limit } = req.query

        const { users, meta } = await list_users({ page, limit })

        res.status(200).json({
            message: "users found",
            meta,
            data: users,
        })
    } catch (error) {
        send_error(res, error)
    }
}

// GET /api/users/:id  (admin)
export const get_user_by_id = async (req, res) => {
    try {
        const user = await get_user(req.params.id)

        res.status(200).json({
            message: "user found",
            data: user,
        })
    } catch (error) {
        send_error(res, error)
    }
}

// GET /api/users/profile
// answered from the id inside the token, so this route can only ever return
// the caller's own row
export const get_own_profile = async (req, res) => {
    try {
        const user = await get_profile(req.user)

        res.status(200).json({
            message: "profile found",
            data: user,
        })
    } catch (error) {
        send_error(res, error)
    }
}

// a body may only carry the three editable fields. anything else is refused
// out loud rather than dropped quietly, so a caller trying to promote itself
// gets a 403 instead of a 200 that looks like it worked
const FORBIDDEN_PROFILE_FIELDS = ["role", "isActive", "password", "id"];

// PUT /api/users/profile/update
export const update_own_profile = async (req, res) => {
    try {
        const blocked = FORBIDDEN_PROFILE_FIELDS.filter((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field)
        )

        if (blocked.length > 0) {
            return res.status(403).json({
                message: "you are not allowed to update " + blocked.join(", ") + " through this endpoint",
            })
        }

        // picked one by one as well, so even a new column added to the model
        // later cannot be written through this handler by accident
        const { firstname, lastname, email } = req.body

        const user = await update_profile({
            requester: req.user, // from the token, never from the body or the url
            firstname,
            lastname,
            email,
        })

        res.status(200).json({
            message: "profile updated",
            data: user,
        })
    } catch (error) {
        send_error(res, error)
    }
}

// PATCH /api/users/password
export const update_own_password = async (req, res) => {
    try {
        const { password } = req.body

        const { id } = await update_password({
            requester: req.user,
            password,
        })

        res.status(200).json({
            message: "password updated",
            data: { id },
        })
    } catch (error) {
        send_error(res, error)
    }
}

// PATCH /api/users/:id/status  (admin)
export const update_status = async (req, res) => {
    try {
        const { isActive } = req.body

        const user = await set_user_status({
            id: req.params.id,
            requester: req.user,
            isActive,
        })

        res.status(200).json({
            message: isActive ? "user activated" : "user deactivated",
            data: user,
        })
    } catch (error) {
        send_error(res, error)
    }
}
