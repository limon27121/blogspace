# Blog API — Execution Plan

Build order for the Blog Management REST API. Each phase is small enough to
finish and test in one sitting. **Do not start a phase until the previous one
runs green** — every phase ends with a check you can actually perform.

Legend: `[x]` done · `[ ]` to do

---

## Ground rules

- Base path for every route: `/api`
- Layers, always in this direction:
  `route -> middleware -> controller -> service -> model`
  A route never touches a model. A service never touches `req`/`res`.
- Passwords are hashed on the way in, and never leave the service layer.
- Anything the client sends that decides *who you are* (`userId`, `role`) is
  ignored — that comes from the JWT only.

### Decisions already locked in

| Question | Decision |
|---|---|
| Delete blog route | Register **both** `DELETE /api/blogs/delete/:id` and `DELETE /api/blogs/:id`. Postman uses `/delete/:id`. |
| User table columns | Spec columns only — no `phonenumber`, no `photo`. |
| Admin account | Register normally, then run one `UPDATE` in SQL. Documented in README. |

---

## Phase 0 — Project skeleton `[x]`

**Goal:** empty folders and installed packages, nothing else.

- [x] Folders: `config/ controller/ middlewares/ models/ routes/ Services/ data/ uploads/`
- [x] `package.json` with `"type": "module"`, scripts `start` / `dev`
- [x] Dependencies: `express@4 sequelize mysql2 bcrypt jsonwebtoken dotenv multer`
- [x] Dev dependency: `nodemon`

**Check:** `npm ls --depth=0` lists all seven dependencies with no `UNMET` lines.

---

## Phase 1 — Database connection `[x]`

**Goal:** Node can reach MySQL. Nothing more.

- [x] `config/db.js` — create the `Sequelize` instance, export `connectDB()`

**What you are learning:** Sequelize needs a live connection *before* any model
is useful. `sequelize.authenticate()` is the cheapest way to prove credentials
work — it fails loudly instead of hanging later inside a query.

**Before moving on:**

```sql
CREATE DATABASE blogdb;
```

**Check:** a throwaway script that calls `connectDB()` prints `Database connected`.
If it prints `Access denied`, fix `.env` now — every later phase depends on this.

---

## Phase 2 — Models and the relationship `[x]`

**Goal:** describe both tables in code, and the link between them.

- [x] `models/user.model.js` — id, firstname, lastname, email (unique), password,
      isActive (default `true`), role (default `"user"`), `createAt` / `updateAt`
- [x] `models/blog.model.js` — id, userId, blogTitle, blog (TEXT), category,
      `createAt` / `updateAt`
- [x] `models/index.js` — `User.hasMany(Blog)` + `Blog.belongsTo(User, { as: "author" })`

**What you are learning:**

- `defaultScope` on `User` excludes `password` from *every* query automatically.
  Login is the one place that opts back in via `User.scope("withPassword")`.
  This is safer than remembering `attributes: { exclude: [...] }` at each call site.
- Associations live in one file so importing a single model can never leave the
  relation half-registered.
- The alias `as: "author"` is what makes the response shape in the spec
  (`"author": { id, firstname, lastname }`) possible in one query.

**Check:** start the server with `sequelize.sync({ alter: true })` and confirm in
MySQL that `users` and `blogs` exist, and that `blogs.userId` has a foreign key
pointing at `users.id`:

```sql
DESCRIBE blogs;
SHOW CREATE TABLE blogs;
```

---

## Phase 3 — Shared middleware `[x]`

**Goal:** the two gates every protected route reuses, plus one error translator.

- [x] `middlewares/auth.middleware.js` — `verify_token`, `is_admin`
- [x] `middlewares/error.middleware.js` — `ServiceError`, `send_error`, `parse_id`

**What you are learning:**

- `verify_token` answers **401** (who are you?), `is_admin` answers **403**
  (you are known, but not allowed). Two different questions, two middlewares,
  two status codes. Mixing them is the most common mistake in this assignment.
- `ServiceError` lets a service say "409, email already registered" without
  importing `res`. The controller is the only layer that talks HTTP.
- `parse_id` turns `/api/users/abc` into a clean **400** instead of a Sequelize
  crash from `findByPk(NaN)`.

**Check:** nothing to run yet — these are used from Phase 4 onward.

---

## Phase 4 — Auth flow `[ ]`

**Goal:** register and login working end to end. This unlocks every other phase,
because you need a token to test them.

- [ ] `Services/auth.service.js` — `register_user()`, `login_user()`
- [ ] `controller/auth.controller.js` — `register`, `log_in`
- [ ] `routes/auth.route.js` — `POST /register`, `POST /login`
- [ ] `app.js` — express app, `express.json()`, mount `/api/auth`
- [ ] `server.js` — load env, `connectDB()`, `sequelize.sync()`, listen

### Rules that are graded here

| Rule | How it is enforced |
|---|---|
| Email unique | check first, then **409**; the unique index is the backstop |
| Password hashed | `bcrypt.hash(password, 10)` before `User.create` |
| Default role `user` | model default, and **never read `role` from `req.body`** |
| Default `isActive` true | model default |
| No self-assigned admin | destructure only the four allowed fields from the body |
| Deactivated user cannot log in | after the password check, `if (!user.isActive)` then **403** |
| Wrong credentials | same message for unknown email and bad password, **401** |

**Why one message for both failures:** if "email not found" and "wrong password"
differ, anyone can use the login endpoint to discover which emails are registered.

**Check with Postman:**

1. `POST /api/auth/register` with a new email → **201**, response has no `password`
2. Repeat the same email → **409**
3. Register with `"role": "admin"` in the body → **201** but the row still says `user`
4. `POST /api/auth/login` correct password → **200** plus `token`
5. Same email, wrong password → **401**
6. Missing `email` → **400**

---

## Phase 5 — Make the admin account `[ ]`

**Goal:** one admin exists so Phase 6 is testable.

- [ ] Register `admin@example.com` through the normal endpoint
- [ ] Promote in SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

- [ ] Log in again — **a token minted before the promotion still says `role: user`**

**What you are learning:** a JWT is a snapshot. Changing the row does not change
tokens already issued. You must log in again to get a token carrying `role: admin`.
This trips people up for half an hour if they do not expect it.

**Check:** decode the new token on jwt.io — the payload shows `"role": "admin"`.

---

## Phase 6 — Admin user management `[ ]`

**Goal:** the three admin-only user endpoints.

- [ ] `Services/user.service.js` — `get_all_users()`, `get_user_by_id()`, `set_user_status()`
- [ ] `controller/users.controller.js` — matching handlers
- [ ] `routes/users.route.js` — `GET /`, `GET /:id`, `PATCH /:id/status`
- [ ] Mount `/api/users` in `app.js`

### Route order matters

Phase 7 adds `GET /api/users/profile`. Express matches **top to bottom**, so
`/:id` declared first would swallow `/profile` and try `findByPk("profile")`.

Declare the literal paths above the parameter path:

```js
router.get("/profile", verify_token, get_profile);      // literal — first
router.put("/profile/update", verify_token, update_profile);
router.patch("/password", verify_token, update_password);
router.get("/", verify_token, is_admin, get_users);
router.get("/:id", verify_token, is_admin, get_user_by_id);   // parameter — last
```

**Check with Postman:**

1. `GET /api/users` with **no** token → **401**
2. With a *user* token → **403**
3. With the *admin* token → **200**, and no `password` field anywhere in the list
4. `GET /api/users/999999` as admin → **404**
5. `GET /api/users/abc` as admin → **400**
6. `PATCH /api/users/:id/status` with `{ "isActive": false }` → **200**
7. Log in as that now-deactivated user → **403**
8. Reactivate, log in again → **200**

---

## Phase 7 — Self-service profile `[ ]`

**Goal:** a logged-in user managing their own record.

- [ ] `get_profile` — `GET /api/users/profile`
- [ ] `update_profile` — `PUT /api/users/profile/update`
- [ ] `update_password` — `PATCH /api/users/password`

### The one rule that is graded hardest

`update_profile` must accept **only** `firstname`, `lastname`, `email`.
Do not pass `req.body` into `user.update()` — that lets a user send
`{ "role": "admin" }` and promote themselves. Pick the fields explicitly:

```js
const { firstname, lastname, email } = req.body   // role and isActive cannot get through
```

Also: the id comes from `req.user.id` (the token), never from the body or the
url, so a caller can only ever edit their own row.

**Check with Postman:**

1. `GET /api/users/profile` with a user token → **200**, own record, no `password`
2. Same with no token → **401**
3. `PUT /api/users/profile/update` sending `{ "role": "admin" }` → role unchanged
4. Update `email` to one that already exists → **409**
5. `PATCH /api/users/password` with a 3-character password → **400**
6. With a valid new password → **200**, then log in with the *new* password → **200**,
   and confirm in MySQL the stored value is a `$2b$...` hash, not plain text

---

## Phase 8 — Blog write operations `[ ]`

**Goal:** create, update, delete — with ownership rules.

- [ ] `Services/blog.service.js` — `create_blog()`, `update_blog()`, `delete_blog()`
- [ ] `controller/blogs.controller.js`
- [ ] `routes/blogs.route.js` — `POST /create`, `PUT /update/:id`,
      `DELETE /delete/:id` **and** `DELETE /:id`
- [ ] Mount `/api/blogs` in `app.js`

### The ownership check, written once

Update and delete need the identical rule, so put it in one helper:

```js
// owner may act on their own blog; admin may act on anyone's
if (blog.userId !== actor.id && actor.role !== "admin") {
  throw new ServiceError(403, "You are not authorized to update this blog.")
}
```

Order matters: **404 before 403.** Look the blog up first. If it does not exist,
say 404 — answering 403 for a missing blog leaks whether that id exists.

`userId` on create comes from `req.user.id`. If the client sends a `userId`,
ignore it silently.

**Check with Postman** (you need two accounts: user A, user B, plus admin):

1. `POST /api/blogs/create` no token → **401**
2. As user A, valid body → **201**, and `userId` equals A's id
3. As user A sending `"userId": <B's id>` → still saved as A
4. Empty `blogTitle` → **400**
5. As user B, `PUT /api/blogs/update/<A's blog>` → **403**
6. As user A, same request → **200**
7. As **admin**, update A's blog → **200**
8. `PUT /api/blogs/update/999999` → **404**
9. As user B, `DELETE /api/blogs/delete/<A's blog>` → **403**
10. As admin, same → **200**
11. Confirm `DELETE /api/blogs/<id>` (no `/delete`) behaves identically

---

## Phase 9 — Public blog reads, search, filter `[ ]`

**Goal:** the guest endpoints. No `verify_token` on these routes at all.

- [ ] `get_blogs()` — list, search and filter in one handler
- [ ] `get_blog_by_id()`

### One endpoint, three behaviours

`GET /api/blogs` also serves `?title=`, `?category=`, and both together. Build
the `where` object conditionally rather than writing three handlers:

```js
import { Op } from "sequelize"

const where = {}
if (title)    where.blogTitle = { [Op.like]: `%${title}%` }   // partial match
if (category) where.category  = category                      // exact match
```

Every read includes the author, limited to the three safe fields:

```js
include: [{
  model: User,
  as: "author",
  attributes: ["id", "firstname", "lastname"],   // never email, never password
}]
```

**Check with Postman:**

1. `GET /api/blogs` with **no** Authorization header → **200**
2. Each item has an `author` object with exactly `id`, `firstname`, `lastname`
3. `GET /api/blogs?title=play` returns the "Playwright" blog — partial match works
4. `GET /api/blogs?category=Testing` returns only that category
5. `GET /api/blogs?title=play&category=Testing` applies both
6. `GET /api/blogs/999999` → **404**
7. Search the whole JSON response for `"password"` and `"email"` — zero hits

---

## Phase 10 — Status code and validation sweep `[ ]`

**Goal:** go back through every endpoint once, checking the codes only.

Walk the table and confirm each one really returns what it should:

| Situation | Expected |
|---|---|
| Created a user or a blog | 201 |
| Any successful read, update or delete | 200 |
| Missing or empty required field | 400 |
| Bad email format | 400 |
| Password shorter than the minimum | 400 |
| Non-numeric `:id` | 400 |
| No token, or an expired or invalid one | 401 |
| Wrong credentials | 401 |
| Valid token, wrong role or not the owner | 403 |
| Deactivated user tries to log in | 403 |
| User or blog id not in the database | 404 |
| Duplicate email | 409 |
| Anything unexpected | 500 with a generic message |

Also confirm: no response anywhere in the API contains a `password` field, and no
500 response leaks a stack trace or a SQL string to the client.

---

## Phase 11 — Repository hygiene `[ ]`

- [ ] `.gitignore` contains `node_modules/` and `.env`, and keeps `.env.example`
- [ ] `.env.example` committed with empty values — no real secrets
- [ ] `git status` shows neither `node_modules` nor `.env` as untracked
- [ ] If `.env` was ever committed, remove it from history before pushing

---

## Phase 12 — Postman collection and documentation `[ ]`

- [ ] Collection with all 13 endpoints from `Submission_Procedure.md`
- [ ] Collection variables: `baseUrl`, `token`, `adminToken`
- [ ] On both login requests, a test script that saves the token automatically:

```js
pm.collectionVariables.set("token", pm.response.json().token)
```

- [ ] Every protected request uses `Bearer {{token}}` — no pasted tokens
- [ ] Example responses saved for the success case *and* the error case of each
      endpoint (this is what makes the published documentation readable)
- [ ] Publish the documentation, copy the public link

---

## Phase 13 — README and submission `[ ]`

- [ ] Project title and short description
- [ ] Tech stack
- [ ] Setup: clone, `npm install`, copy `.env.example` to `.env`, `CREATE DATABASE blogdb`, `npm run dev`
- [ ] `.env` variable table
- [ ] **The admin promotion SQL**, so a grader can create an admin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

- [ ] Endpoint table (all 13, with the access level)
- [ ] Link to the published Postman documentation
- [ ] Push, then open the repo URL in a private window to confirm it is public

---

## Quick reference — what lives where when you are done

```
Assginment/
├── config/db.js                       Sequelize instance + connectDB()
├── models/
│   ├── user.model.js                  users table
│   ├── blog.model.js                  blogs table
│   └── index.js                       associations
├── middlewares/
│   ├── auth.middleware.js             verify_token, is_admin
│   └── error.middleware.js            ServiceError, send_error, parse_id
├── Services/
│   ├── auth.service.js                register_user, login_user
│   ├── user.service.js                list, get by id, status, profile, password
│   └── blog.service.js                create, update, delete, list, get by id
├── controller/
│   ├── auth.controller.js
│   ├── users.controller.js
│   └── blogs.controller.js
├── routes/
│   ├── auth.route.js                  /api/auth
│   ├── users.route.js                 /api/users
│   └── blogs.route.js                 /api/blogs
├── app.js                             express app, json parser, route mounts
├── server.js                          env, connectDB, sync, listen
├── .env / .env.example
├── .gitignore
└── README.md
```
