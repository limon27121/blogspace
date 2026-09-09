import express from "express";
import {
    get_users,
    get_user_by_id,
    get_own_profile,
    update_own_profile,
    update_own_password,
    update_status,
} from "../controller/user.controller.js";
import { verify_token, is_admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// nothing here is public, so the token check runs once for every route below
// instead of being repeated on each one
router.use(verify_token);

// self-service. the row is chosen by the token, so no id appears in the path
// and a caller cannot reach anyone else through these
router.get("/profile", get_own_profile);
router.put("/profile/update", update_own_profile);
router.patch("/password", update_own_password);

// admin only
//get all users as admin
router.get("/", is_admin, get_users);
router.patch("/:id/status", is_admin, update_status);

// declared last: express matches top to bottom, so "/:id" placed above would
// swallow "/profile" and hand "profile" to parse_id as an id

//user id
router.get("/:id", is_admin, get_user_by_id);

export default router;
