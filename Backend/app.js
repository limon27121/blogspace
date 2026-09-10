import express from "express";
import cors from "cors";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import blogRoute from "./routes/blogs.route.js";

const app = express();

// the frontend runs on its own origin (localhost:3000 in development), so a
// browser refuses to hand it any response from here without this header.
// curl, postman and newman never notice: only browsers enforce CORS.
// the allowed origins come from .env, so a deployed frontend can be added
// without editing this file
const allowed_origins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        // a request with no Origin header is not a browser page - curl, newman,
        // a server-to-server call - and there is no other site to protect it
        // from, so it passes through
        origin: (origin, callback) => {
            if (!origin || allowed_origins.includes(origin)) return callback(null, true);
            callback(new Error("origin not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        // the token travels in the Authorization header, so it has to be named
        // here or the preflight for every authenticated call is refused
        allowedHeaders: ["Content-Type", "Authorization"],
        // credentials stay off: nothing here is stored in a cookie
    })
);

app.use(express.json()); // parse JSON request body

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/blogs", blogRoute);

// nothing above matched, so the path does not exist. the method and the raw
// url are echoed back because "route not found" alone cannot tell a wrong
// path apart from a right path reached with the wrong method
app.use((req, res) => {
    res.status(404).json({
        message: "route not found",
        method: req.method,
        path: req.originalUrl,
    })
});

// express hands any error thrown in a handler here. four arguments is what
// marks this as an error handler, so `next` must stay even though it is unused
app.use((err, req, res, next) => {
    // express.json() rejects a body it cannot parse before any route runs, so
    // that failure arrives here rather than in a controller. it is bad input,
    // not a server fault, and 500 would blame the wrong side
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "request body is not valid JSON" })
    }

    // the stack goes to the log, never to the client: a parser path or a sql
    // string in a response would tell a caller how the server is built
    console.error(err)
    res.status(500).json({ message: "something went wrong" })
});

export default app;
