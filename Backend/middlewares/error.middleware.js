// an expected, client-caused failure: the controller turns this into a
// response with the given status instead of a generic 500
export class ServiceError extends Error {
    constructor(status, message) {
        super(message)
        this.name = "ServiceError"
        this.status = status
    }
}

// one place to turn a thrown error into a response, so every handler answers
// the same way for the same kind of failure
export const send_error = (res, error) => {
    if (error instanceof ServiceError) {
        return res.status(error.status).json({ message: error.message })
    }

    // a unique constraint tripped at the db level rather than in our check
    if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ message: "email already registered" })
    }

    // bad data from the client, not a server bug
    if (error.name === "SequelizeValidationError") {
        return res.status(400).json({ message: error.errors[0].message })
    }

    console.error(error)
    res.status(500).json({ message: "something went wrong" })
}

// :id came off the url as text, so it has to be a real positive integer before
// it is handed to findByPk
export const parse_id = (value, label) => {
    const id = Number(value)

    if (!Number.isInteger(id) || id < 1) {
        throw new ServiceError(400, `${label} must be a positive integer`)
    }

    return id
}
