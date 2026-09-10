import express from "express";
import {
    get_users,
    get_user_by_id,
    get_own_profile,
    update_own_profile,
    update_own_password,
    update_status,
    update_own_image,
} from "../controller/user.controller.js";
import { verify_token, is_admin } from "../middlewares/auth.middleware.js";
import { upload_image, MAX_IMAGE_BYTES } from "../middlewares/upload.middleware.js";

// multer reports its own failures - a file over the limit, a rejected type - by
// calling next(error). Without this they would reach the global handler and be
// answered as 500s, when every one of them is a bad request.
const handle_upload = (req, res, next) => {
    upload_image.single("image")(req, res, (error) => {
        if (!error) return next()

        if (error.code === "LIMIT_FILE_SIZE") {
            const megabytes = MAX_IMAGE_BYTES / (1024 * 1024)
            return res.status(400).json({ message: `image must be ${megabytes} MB or smaller` })
        }

        if (error.code === "INVALID_FILE_TYPE") {
            return res.status(400).json({ message: error.message })
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ message: 'the file field must be named "image"' })
        }

        next(error)
    })
}

const router = express.Router();

// nothing here is public, so the token check runs once for every route below
// instead of being repeated on each one
router.use(verify_token);

// self-service. the row is chosen by the token, so no id appears in the path
// and a caller cannot reach anyone else through these
router.get("/profile", get_own_profile);
router.put("/profile/update", update_own_profile);
router.patch("/password", update_own_password);

// multipart, not JSON: express.json() ignores this body and multer parses it.
// the row is chosen by the token here too, so no id appears in the path
router.patch("/profile/image", handle_upload, update_own_image);

// admin only
//get all users as admin
router.get("/", is_admin, get_users);
router.patch("/:id/status", is_admin, update_status);

// declared last: express matches top to bottom, so "/:id" placed above would
// swallow "/profile" and hand "profile" to parse_id as an id

//user id
router.get("/:id", is_admin, get_user_by_id);

export default router;
