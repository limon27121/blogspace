import {
    list_users,
    get_user,
    get_profile,
    update_profile,
    update_password,
    set_user_status,
    update_profile_image,
} from "../Services/user.service.js";
import { send_error } from "../middlewares/error.middleware.js";
import { remove_uploaded_file, looks_like_an_image } from "../middlewares/upload.middleware.js";

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

// PATCH /api/users/profile/image
// multer has already written the file and put it on req.file by the time this
// runs; a rejected upload never reaches here, it is answered by the error
// handler on the route
export const update_own_image = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "an image file is required" })
        }

        // the extension and the mimetype both came from the caller. The bytes
        // did not, so they are what decides. A rejected file is deleted here:
        // multer has already written it to disk by this point
        if (!(await looks_like_an_image(req.file.path))) {
            remove_uploaded_file("/uploads/" + req.file.filename)
            return res.status(400).json({ message: "the uploaded file is not a valid image" })
        }

        // the public path, not the disk path: the client needs a URL it can put
        // in an <img src>, and where the folder lives is nobody else's business
        const image = "/uploads/" + req.file.filename

        const { user, previous_image } = await update_profile_image({
            requester: req.user,
            image,
        })

        // the row already points at the new file, so the old one is unreachable
        if (previous_image && previous_image !== image) {
            remove_uploaded_file(previous_image)
        }

        res.status(200).json({
            message: "profile image updated",
            data: user,
        })
    } catch (error) {
        // the row was not updated, so the file just written is an orphan
        if (req.file) remove_uploaded_file("/uploads/" + req.file.filename)
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
