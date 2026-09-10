import fs from "fs";
import path from "path";
import multer from "multer";

// uploads/ sits next to the source, not inside it: nothing here is imported by
// the app, and a file written into a source folder ends up in the next commit
export const UPLOAD_DIR = path.resolve("uploads");

// created on boot rather than on the first request, so a failed mkdir shows up
// when the server starts instead of halfway through an upload
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

// the client decides this header, so it is a cheap first pass, not proof:
// curl derives it from the extension alone. looks_like_an_image below checks
// the bytes that were actually written
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),

    // never trust the uploaded name: it can carry ../ or a shell character, and
    // two users uploading "photo.png" would overwrite each other. the owner id
    // plus a timestamp is unique and says who it belongs to
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase().slice(0, 10)
        const safeExtension = /^\.[a-z0-9]+$/.test(extension) ? extension : ""
        cb(null, `user-${req.user.id}-${Date.now()}${safeExtension}`)
    },
})

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true)

    // a plain Error would surface as a 500. this one is recognised by the
    // controller and answered as a 400, because the request is what is wrong
    const error = new Error("only jpeg, png, webp and gif images are allowed")
    error.code = "INVALID_FILE_TYPE"
    cb(error)
}

export const upload_image = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
})

/**
 * Read the first bytes of the written file and check them against the
 * signatures real images start with.
 *
 * The mimetype multer filters on is supplied by the client: curl derives it
 * from the extension, and a browser can be made to send anything. A .txt
 * renamed to .jpg therefore passes that filter. The bytes on disk cannot lie.
 *
 * @param {string} diskPath
 * @returns {Promise<boolean>}
 */
export const looks_like_an_image = async (diskPath) => {
    let handle
    try {
        handle = await fs.promises.open(diskPath, "r")
        const { buffer, bytesRead } = await handle.read(Buffer.alloc(12), 0, 12, 0)
        if (bytesRead < 12) return false

        // jpeg: FF D8 FF
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true

        // png: 89 "PNG" CR LF 1A LF
        if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
            return true
        }

        // gif: "GIF87a" or "GIF89a"
        const head = buffer.toString("latin1", 0, 6)
        if (head === "GIF87a" || head === "GIF89a") return true

        // webp: "RIFF" ....  "WEBP"
        if (buffer.toString("latin1", 0, 4) === "RIFF" && buffer.toString("latin1", 8, 12) === "WEBP") {
            return true
        }

        return false
    } catch {
        return false
    } finally {
        await handle?.close().catch(() => {})
    }
}

/**
 * Remove a previously uploaded file. Called when a user replaces their picture,
 * so the folder does not fill with images nothing points at.
 *
 * @param {string|null} publicPath the stored value, e.g. "/uploads/user-3-17.png"
 */
export const remove_uploaded_file = (publicPath) => {
    if (!publicPath) return

    // only ever delete inside uploads/, and only the basename: a stored value
    // that somehow contained ../ must not be able to reach anything else
    const name = path.basename(publicPath)
    const target = path.join(UPLOAD_DIR, name)

    if (!target.startsWith(UPLOAD_DIR)) return

    fs.promises.unlink(target).catch(() => {
        // the row is already updated and the request has succeeded; a leftover
        // file is not worth failing the response over
    })
}
