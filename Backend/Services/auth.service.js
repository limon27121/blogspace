import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { ServiceError } from "../middlewares/error.middleware.js";

const MIN_PASSWORD_LENGTH = 6;

// shared by register and by the password-update service in phase 7
export const hash_password = async (password) => {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        throw new ServiceError(
            400,
            `password must be at least ${MIN_PASSWORD_LENGTH} characters`
        )
    }

    return bcrypt.hash(password, 10)
}

export const register_user = async ({ firstname, lastname, email, password }) => {
    // note what is NOT in this signature: role and isActive. the controller
    // never forwards them, so a caller cannot make themselves an admin here.
    // the model defaults supply role = "user" and isActive = true
    // lastname is optional, so it is not in this check. an empty string or a
    // missing key both become null rather than a "" row
    if (!firstname || !email || !password) {
        throw new ServiceError(400, "firstname, email and password are required")
    }

    const existing = await User.findOne({ where: { email } })
    if (existing) {
        throw new ServiceError(409, "email already registered")
    }

    const hashedPassword = await hash_password(password)

    const user = await User.create({
        firstname,
        lastname: lastname || null,
        email,
        password: hashedPassword,
    })

    // the model's defaultScope already strips password from reads, but this row
    // came back from create(), so drop it explicitly
    const { password: _password, ...safeUser } = user.toJSON()

    return safeUser
}

export const login_user = async ({ email, password }) => {
    if (!email || !password) {
        throw new ServiceError(400, "email and password are required")
    }

    // the only place in the app that opts back into the password column
    const user = await User.scope("withPassword").findOne({ where: { email } })

    // same message for an unknown email and a wrong password, so this endpoint
    // cannot be used to discover which emails are registered
    if (!user) {
        throw new ServiceError(401, "invalid email or password")
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
        throw new ServiceError(401, "invalid email or password")
    }

    // checked after the password, so a wrong guess still gets the generic 401
    // and cannot reveal that a given account exists but is deactivated
    if (!user.isActive) {
        throw new ServiceError(403, "this account has been deactivated")
    }

    // role travels inside the token, so is_admin can decide without a db read.
    // a token issued before a role change still carries the old role until the
    // user logs in again
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.SECRET_KEY,
        { expiresIn: "1d" }
    )

    return {
        token,
        user: {
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
        },
    }
}

// one hour. Long enough to walk to the inbox, short enough that a link left in
// a mailbox is not a standing key to the account
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// what is emailed is the raw token; what is stored is this hash of it. A stolen
// database dump therefore contains nothing that can reset a password
export const hash_reset_token = (token) =>
    crypto.createHash("sha256").update(token).digest("hex")

/**
 * Start a password reset.
 *
 * Returns { user, token } when a link should be sent, and null otherwise. The
 * caller answers the same way either way: telling an anonymous caller whether
 * an address is registered turns this endpoint into an account-discovery tool.
 *
 * @param {{ email: string }} params
 */
export const request_password_reset = async ({ email }) => {
    if (typeof email !== "string" || email.trim() === "") {
        throw new ServiceError(400, "email is required")
    }

    const user = await User.findOne({ where: { email: email.trim() } })

    // no account, or a deactivated one: nothing is stored and nothing is sent,
    // but the controller still replies with its neutral message
    if (!user || !user.isActive) return null

    // 32 random bytes, not a uuid or a counter: this is the only thing standing
    // between a stranger and the account
    const token = crypto.randomBytes(32).toString("hex")

    user.resetTokenHash = hash_reset_token(token)
    user.resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS)
    await user.save()

    // asking again invalidates the previous link, because the column holds one
    // hash and this overwrote it
    return { user, token }
}
