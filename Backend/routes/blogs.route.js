import express from "express";
import {
    create,
    update,
    remove,
    get_blogs,
    get_blog_by_id,
} from "../controller/blogs.controller.js";
import { verify_token } from "../middlewares/auth.middleware.js";

const router = express.Router();

// public. a guest reads blogs without any token, so verify_token is attached
// per route below instead of to the whole router
router.get("/", get_blogs);

// writes, all authenticated

router.post("/create", verify_token, create);

router.put("/update/:id", verify_token, update);

// the assignment names DELETE /api/blogs/:id, the plan also asks for
// /delete/:id. both point at the same handler so either shape works
router.delete("/delete/:id", verify_token, remove);
router.delete("/:id", verify_token, remove);

// declared after the literal paths, so "/create" is never read as an id
router.get("/:id", get_blog_by_id);

export default router;
