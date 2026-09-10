# Blog Frontend — Execution Plan

Build order for the Next.js Blog Management frontend described in
`Project_description.md`. Each phase is small enough to finish and check in one
sitting. **Do not start a phase until the previous one runs green** — every
phase ends with a check you can actually perform in the browser.

Legend: `[x]` done · `[ ]` to do · `[!]` blocked on backend work

---

## Ground rules

- Every byte of data comes from the REST API. No fake blogs, no hardcoded
  users, no static JSON, no mock server, no direct database access.
- Layers, always in this direction:
  `page -> component -> service -> api client`
  A page never calls `fetch` directly. A service never touches React state.
- The token is the only source of identity. The frontend never sends `userId`,
  `role` or `isActive` on a write.
- Hiding a menu is not authorization. Every admin page also checks the role,
  and every page respects a 401/403 that comes back from the backend.
- Tailwind CSS for all styling. No second UI framework.

### Backend contract — read this before writing any service

The backend answers with a fixed envelope. Match it exactly or every service
returns `undefined`.

| Case | Shape |
|---|---|
| Success | `{ "message": "...", "data": ... }` |
| Login success | `{ "message": "...", "token": "...", "data": {...} }` |
| Any error | `{ "message": "..." }` — no `data` key |

`data` is an object for a single record, an array for a list. A blog carries
`author: { id, firstname, lastname }` and nothing more. `lastname` is nullable,
so never render `user.lastname` without a fallback.

Base URL: `http://localhost:5000/api` — read from `NEXT_PUBLIC_API_URL`, never
typed into a component.

### Decisions already locked in

| Question | Decision |
|---|---|
| Router | App Router (`app/`), JavaScript, not TypeScript |
| Token storage | `localStorage`, read once on mount into `AuthContext` |
| Who fetches | Client components. Auth is a bearer token held in the browser, so a server component cannot see it |
| Delete endpoint | `DELETE /api/blogs/delete/:id` — the backend registers `/:id` too, but the submission table names `/delete/:id` |
| `lastname` missing | Render `firstname` alone; never print "undefined" |
| Avatar with no image | Initials on a colored circle, generated client-side from the name |

**On `localStorage`:** any script running on the page can read it, so a single
XSS bug exposes the token. An httpOnly cookie set by the backend would be safer,
but the backend returns the token in the JSON body and this assignment expects
the frontend to store it. Storing it in `localStorage` is the intended path
here — just do not also log it, put it in a URL, or send it anywhere but the
`Authorization` header.

### Three backend endpoints do not exist yet

`Project_description.md` §38 lists these as required, and §1 forbids mocking
them. The backend from the API assignment implements none of them:

| Endpoint | Frontend section | Backend status |
|---|---|---|
| `POST /api/auth/forgot-password` | §25 | missing |
| `PATCH /api/auth/reset-password/:token` | §26 | missing |
| `PATCH /api/users/profile/image` | §22 | missing — `users` has no image column either |

These are **Phase 17**. Build every other phase first: nothing else depends on
them, and the pages can be written against the agreed request shapes while the
backend catches up. Do not stub them with fake responses in the meantime —
leave the page unbuilt rather than ship a lie.

---

## Phase 0 — Project skeleton `[x]`

**Goal:** an empty Next.js app that boots, with Tailwind working. Nothing else.

- [x] `npx create-next-app@latest .` — App Router yes, Tailwind yes,
      TypeScript no, `src/` no, import alias `@/*` yes
      (npm rejects the capital in `Frontend/` as a package name, so the app was
      generated in a temp `frontend-init/` and moved in; `package.json` name is
      `blog-frontend`. Next 16.3.4, React 19, Tailwind v4)
- [x] Folders: `components/ services/ contexts/ utils/` (each holds a
      `.gitkeep` so git tracks the empty folder)
- [x] `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
- [x] `.env.example` with the same key and an empty value
- [x] `.gitignore` already covers `node_modules/`, `.next/` and `.env*.local` —
      confirm rather than assume
      (it ignores `.env*`, which swallowed `.env.example` too — added a
      `!.env.example` negation so the template stays committed)

**What you are learning:** only variables prefixed `NEXT_PUBLIC_` reach the
browser. The API URL must be public because the fetch happens client-side. A
secret must never carry that prefix.

**Check:** `npm run dev`, open `http://localhost:3000`, and confirm a Tailwind
class actually applies — put `className="text-3xl text-blue-600"` on something
and see it render blue and large. If it renders plain, Tailwind is not wired and
every later phase will look broken.

**Result:** `next dev` ready in 465ms, `/` returns 200, and the emitted
stylesheet contains `.text-blue-600 { color: var(--color-blue-600) }`.
`app/page.js` is a throwaway placeholder carrying that class — Phase 3
replaces it.

---

## Phase 1 — API layer and services `[x]`

**Goal:** one place that talks HTTP, three modules that name the endpoints.
No UI yet.

- [x] `utils/api.js` — `apiFetch(path, options)`
      (reads `localStorage` only behind a `typeof window` check, so a service
      imported into a server component does not throw before the fetch)
- [x] `services/auth.service.js` — `register`, `login` (both `auth: false`)
- [x] `services/user.service.js` — `getProfile`, `updateProfile`,
      `changePassword`, `getUsers`, `getUserById`, `setUserStatus`
      (`updateProfile` sends only `firstname`/`lastname`: the backend answers
      403 if the body even mentions `role` or `isActive`)
- [x] `services/blog.service.js` — `getBlogs`, `getBlogById`, `createBlog`,
      `updateBlog`, `deleteBlog`

### What `apiFetch` must do

```js
const BASE = process.env.NEXT_PUBLIC_API_URL

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = {}
  const token = auth ? localStorage.getItem("token") : null

  if (token) headers.Authorization = `Bearer ${token}`

  // FormData sets its own multipart boundary — setting Content-Type by hand breaks the upload
  const isForm = body instanceof FormData
  if (body && !isForm) headers["Content-Type"] = "application/json"

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    // the backend's own message is the one the user should read
    const error = new Error(json.message || "Something went wrong")
    error.status = res.status
    throw error
  }

  return json   // { message, data } — the caller picks what it needs
}
```

**What you are learning:**

- Throwing on `!res.ok` is what lets every page write `try/catch` instead of
  checking a status code in twenty places. `fetch` does **not** throw on 404 or
  500 by itself — that is the single most common mistake in this assignment.
- `error.message` carries the backend's own wording, so §31 ("display backend
  errors") is satisfied by rendering `error.message` and nothing else. A raw
  JavaScript error never reaches the screen.
- `error.status` is kept so a caller can react to 401 differently from 400.

Services stay thin — they name an endpoint and nothing more:

```js
export const getBlogs = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v)   // drop empty title/category
  ).toString()
  return apiFetch(`/blogs${query ? `?${query}` : ""}`, { auth: false })
}
```

**Check:** with the backend running, open the browser console on any page and
call a service by hand. `getBlogs()` returns `{ message, data }` with `data` an
array. `getBlogById(999999)` throws, and the caught error's `.message` reads
`blog not found` with `.status === 404`.

**Result:** eslint clean, and the check now runs against the **real backend**
(2026-09-10, `Backend/` on `http://localhost:5000/api`): `getBlogs()` returned
`{ message: "blogs found", data: Array(12) }`;
`getBlogs({ title: "play", category: "" })` requested `/api/blogs?title=play`
with the empty filter dropped and **no** `Authorization` header;
`getBlogById(999999)` threw an `Error` with `.message === "blog not found"` and
`.status === 404`. Phase 1 is closed — Phase 2 can start.

---

## Phase 2 — Auth context and session persistence `[x]`

**Goal:** the app knows who is logged in, and still knows after a refresh.

- [x] `contexts/AuthContext.jsx` — provider exposing
      `{ user, loading, login, logout, refreshUser }`, plus a `useAuth()` hook
      that throws when it is read outside the provider
- [x] Wrap `app/layout.jsx` in the provider
      (`app/layout.js` renamed to `.jsx` to match the tree at the bottom)
- [x] `utils/auth.js` — `getToken`/`setToken`/`clearToken`, so the
      `"token"` key is written in exactly one place; `utils/api.js` now reads
      the token through it instead of touching `localStorage` itself

### The refresh problem

`localStorage` survives a refresh; React state does not. On mount the provider
has a token but no user, so it must fetch the profile before deciding anything:

```js
useEffect(() => {
  const token = localStorage.getItem("token")
  if (!token) { setLoading(false); return }

  getProfile()
    .then(res => setUser(res.data))
    .catch(() => { localStorage.removeItem("token"); setUser(null) })  // expired or tampered
    .finally(() => setLoading(false))
}, [])
```

**`loading` is not optional.** Without it there is a moment where `user` is
`null` because the fetch has not finished, and any guard written in Phase 9
would read that as "logged out" and bounce a logged-in user to `/login` on every
refresh. Every guard must wait for `loading === false`.

`refreshUser` re-reads the profile without a re-login. Phase 16 needs it so a
new avatar appears in the navbar immediately (§22).

**Check:**

1. Log in through the console: `login(email, password)` — `user` populates
2. Refresh the page — `user` comes back on its own, no second login
3. Corrupt the token in devtools (change one character) and refresh — the app
   lands logged out, and the bad token is gone from `localStorage`

**Result:** `next build` compiles and prerenders `/` with the provider in the
tree, which is the real check that nothing reads `localStorage` during a
server render — every accessor in `utils/auth.js` guards on `window`.
`next dev` serves `/` with a 200 and no hydration warning. eslint clean, after
one rewrite: the mount effect originally called `setLoading(false)` straight
from the effect body on the no-token path, which
`react-hooks/set-state-in-effect` rejects as a cascading render. Both paths now
resolve through one promise, so state is set from a callback either way.

The three console checks above still need a running backend (`Backend/` has no
`.env`) — `login`, refresh persistence and the corrupt-token path are written
but unproven at runtime. Run them before Phase 8 relies on them.

`login()` stores the token and then calls `getProfile()` rather than trusting
the login response body, so `user` has one shape everywhere. If that profile
call fails the token is cleared again — a half-logged-in session, with a token
but no user, would send every later guard the wrong answer.

---

## Phase 3 — Public shell `[ ]`

**Goal:** the frame every guest page sits inside.

- [ ] `components/Navbar.jsx` — logo, search box, Login/Register for guests,
      `ProfileMenu` for authenticated users
- [ ] `components/Footer.jsx`
- [ ] `app/layout.jsx` — provider, Navbar, `{children}`, Footer
- [ ] `components/Loader.jsx` and a card skeleton, used from Phase 4 onward

The navbar is fixed (§3), so the page body needs top padding equal to the navbar
height or the first row of content hides underneath it.

**Check:** the navbar stays put while the page scrolls, shows Login/Register in
a private window, and no content is trapped behind it at the top of the page.

---

## Phase 4 — Homepage blog list `[ ]`

**Goal:** `/` renders real blogs from the API.

- [ ] `components/BlogCard.jsx` — title, category, preview, author name, author
      avatar, created date, Read More
- [ ] `app/page.jsx` — calls `getBlogs()`, maps to cards

Three states, all required (§32, §33):

| State | Render |
|---|---|
| `loading` | skeleton cards, not a bare spinner |
| `error` | the caught `error.message` |
| `data.length === 0` | `No blogs found.` |

The preview is a truncated `blog` field — cut it in the card, do not ask the
backend for a shorter one. The date comes from `createAt` (that spelling, not
`createdAt` — the backend renamed the timestamp columns).

**Check:**

1. `/` lists blogs created through Postman during the backend assignment
2. Stop the backend and reload — a readable message appears, not a blank page
   and not a stack trace
3. In devtools Network, exactly one request to `/api/blogs` per load — a second
   one means an effect is missing its dependency array

---

## Phase 5 — Search and category filter `[ ]`

**Goal:** §6, §7, §8 — either filter alone, and both together.

- [ ] `components/SearchBar.jsx`
- [ ] `components/CategoryFilter.jsx` — All, Testing, Automation, Programming,
      DevOps, AI
- [ ] Homepage reads both from the URL and passes them to `getBlogs`

### Keep the filters in the URL, not in component state

`/?title=playwright&category=Testing` makes the result shareable, survives a
refresh, and makes the back button behave. Use `useSearchParams` to read and
`router.push` to write.

Two details that decide whether this feels finished:

- **Debounce the search input** (~400 ms). Without it every keystroke fires a
  request, and the responses can arrive out of order — the list ends up showing
  results for `play` after you have typed `playwright`.
- **`All` means no parameter at all.** Sending `category=All` asks the backend
  for a category literally named "All" and returns an empty list.

**Check:**

1. Type `play` — the request URL is `/api/blogs?title=play`, and the list
   narrows to matching titles
2. Pick `Testing` — `/api/blogs?category=Testing`
3. Both together — `/api/blogs?title=play&category=Testing`
4. A search with no matches shows `No blogs found.`, not an error
5. Copy the URL into a new tab — the same filtered list loads

---

## Phase 6 — Blog details page `[ ]`

**Goal:** `/blogs/[id]` (§9).

- [ ] `app/blogs/[id]/page.jsx` — `getBlogById(id)`
- [ ] Title, full content, category, author name, author avatar, created date
- [ ] A `Blog Not Found` page when the service throws 404

**Check:** a Read More button opens the right blog; `/blogs/999999` shows the
Not Found message and no console error; `/blogs/abc` shows the backend's 400
message rather than crashing.

---

## Phase 7 — Registration `[ ]`

**Goal:** `/register` (§10).

- [ ] `app/register/page.jsx` — firstname, lastname, email, password, confirm
- [ ] Validation before the request: required fields, email format, password
      minimum 6, confirmation matches
- [ ] `POST /api/auth/register`, then redirect to `/login`

The confirm-password field is frontend-only — it is never sent. Send exactly
`{ firstname, lastname, email, password }` and nothing else: an extra `role`
key is a §42 violation even though the backend ignores it.

**Check:**

1. A new email registers and lands on `/login`
2. The same email again shows `email already registered` (the backend's 409
   message, rendered as-is)
3. A 3-character password is blocked in the browser — no request is sent
4. `not-an-email` is blocked in the browser
5. Devtools Network confirms the payload has exactly four keys

---

## Phase 8 — Login `[ ]`

**Goal:** `/login` (§11), wired to the context from Phase 2.

- [ ] `app/login/page.jsx` — email, password, Forgot Password? link
- [ ] On success: store the token, load the profile, redirect to `/dashboard`
- [ ] Submit button disabled while pending, label `Logging in...` (§32)

**Check:**

1. Valid credentials land on `/dashboard` and the navbar shows the name
2. A wrong password shows `invalid email or password`
3. A deactivated account shows `this account has been deactivated` — deactivate
   one through Postman to test it
4. Double-clicking Submit fires one request, not two
5. Refresh after login — still logged in

---

## Phase 9 — Route protection and dashboard shell `[ ]`

**Goal:** the authenticated frame, and the guards that keep guests out.

- [ ] `components/Sidebar.jsx` — user menu and admin menu, active item marked,
      drawer on mobile
- [ ] `components/ProfileMenu.jsx` — avatar, name, dropdown with Profile,
      Change Password, Logout
- [ ] `app/dashboard/layout.jsx` — redirects to `/login` when not authenticated
- [ ] `app/admin/layout.jsx` — additionally requires `role === "admin"`
- [ ] Logout: clear the token, clear user state, redirect to `/login`

### The guard, and the mistake to avoid

```js
const { user, loading } = useAuth()
const router = useRouter()

useEffect(() => {
  if (!loading && !user) router.replace("/login")
}, [loading, user, router])

if (loading) return <Loader />
if (!user) return null            // never flash protected content
```

`!loading &&` is the whole trick. Redirecting on `!user` alone bounces every
logged-in user to `/login` on refresh, because `user` is briefly `null` while
the profile request is in flight.

Admin gets the same shape with `user.role !== "admin"` → `Access Denied`.

**Check:**

1. `/dashboard` in a private window redirects to `/login`
2. Log in, then refresh `/dashboard` — it stays, no flicker to `/login`
3. A normal user typing `/admin/users` gets Access Denied, never the table
4. The sidebar shows `Users` only for an admin
5. Logout, then press Back — `/dashboard` does not come back
6. Below 768px the sidebar is a drawer and the navbar still works

---

## Phase 10 — Dashboard home `[ ]`

**Goal:** `/dashboard` (§15).

- [ ] Welcome line with the first name
- [ ] Total blogs owned by this user
- [ ] Profile summary card
- [ ] Quick Create Blog button
- [ ] Recent blogs list

The backend has no stats endpoint. Derive the count from `getBlogs()` filtered
by the current user's id client-side — deriving from real API data is fine,
inventing a number is not.

**Check:** the count matches what `/dashboard/blogs` lists. Create a blog and
the number goes up.

---

## Phase 11 — Create blog `[ ]`

**Goal:** `/dashboard/blogs/create` (§16).

- [ ] `components/BlogForm.jsx` — reused unchanged by Phase 13
- [ ] Title, category (same list as the filter), content
- [ ] `POST /api/blogs/create`, then redirect to `/dashboard/blogs`

Send exactly `{ blogTitle, blog, category }`. **No `userId`** — §42 names this
explicitly, and the backend takes the owner from the token regardless.

Validate title, content and category before sending. Button reads
`Publishing...` while pending and is disabled (§32).

**Check:**

1. A valid blog returns 201 and appears in the list
2. Devtools Network confirms the payload has exactly three keys
3. An empty title is blocked in the browser
4. Rapid double-click creates one blog, not two
5. The new blog appears on the public homepage as well

---

## Phase 12 — Blog management and delete `[ ]`

**Goal:** `/dashboard/blogs` (§17, §19).

- [ ] Table: Title, Category, Author, Created, Actions
- [ ] Normal user sees only their own blogs; admin sees all (§4 sidebar naming)
- [ ] `components/ConfirmDialog.jsx`
- [ ] Delete calls `DELETE /api/blogs/delete/:id` after confirmation
- [ ] Success feedback, then refresh the list
- [ ] Empty state: `You haven't created any blogs yet.`

The list comes from `getBlogs()` filtered by `author.id === user.id` for a
normal user. Do not send a `userId` query parameter — the backend does not
support one.

**Check:**

1. A normal user sees only their own rows
2. An admin sees every blog
3. Delete asks first, and Cancel really cancels — reload and the blog is there
4. Confirming removes the row without a manual refresh
5. Delete is not offered on another user's blog for a normal user

---

## Phase 13 — Edit blog `[ ]`

**Goal:** `/dashboard/blogs/[id]/edit` (§18).

- [ ] Load with `getBlogById(id)` and prefill `BlogForm`
- [ ] Submit calls `PUT /api/blogs/update/:id`
- [ ] Render the backend's 403 message when it is not yours

**Check:**

1. The form opens already filled in
2. A change saves and shows on the public detail page
3. As user B, edit user A's blog by typing the URL — the page shows
   `You are not authorized to update this blog.`
4. As admin, the same edit succeeds
5. `/dashboard/blogs/999999/edit` shows Not Found

---

## Phase 14 — Profile and edit profile `[ ]`

**Goal:** `/dashboard/profile` (§20, §21).

- [ ] `GET /api/users/profile` — avatar, firstname, lastname, email, role
- [ ] Edit form for firstname and lastname
- [ ] `PUT /api/users/profile/update`
- [ ] Call `refreshUser()` after a successful save so the navbar name updates
- [ ] Email read-only; **no control anywhere for `role` or `isActive`** (§21)

Role is displayed as text. The moment it becomes a `<select>`, §42 is violated
even if the backend rejects the change.

**Check:**

1. The page shows the logged-in user's own record
2. A name change persists after a refresh
3. The navbar name updates without a re-login
4. Search the rendered page for a role or status input — there is none

---

## Phase 15 — Change password `[ ]`

**Goal:** `/dashboard/change-password` (§24).

- [ ] New password, confirm new password
- [ ] Confirmation checked in the browser before any request
- [ ] `PATCH /api/users/password` with `{ password }`

**Check:** mismatched fields never reach the network; a valid change succeeds,
and after logging out the new password works and the old one returns
`invalid email or password`.

---

## Phase 16 — Admin user management `[ ]`

**Goal:** `/admin/users` (§27, §28, §29).

- [ ] Table: User, Email, Role, Status, Action
- [ ] `GET /api/users`
- [ ] Detail view via `GET /api/users/:id` — name, email, role, status, image,
      created date
- [ ] Activate / Deactivate via `PATCH /api/users/:id/status`
- [ ] Update the row immediately on success, no full reload
- [ ] Empty state: `No users found.`

**Check:**

1. An admin sees the list; a normal user typing the URL gets Access Denied
2. Deactivate flips the row to Inactive at once
3. That user can no longer log in — the login page shows
   `this account has been deactivated`
4. Reactivate, and they can log in again
5. No password appears anywhere in the response (check the Network tab)

---

## Phase 17 — Backend-dependent features `[!]`

**Goal:** §22, §25, §26 — blocked until the backend gains three endpoints.

### Backend work required first

| Endpoint | Needs |
|---|---|
| `PATCH /api/users/profile/image` | multer upload, field `image`, an image column on `users`, static serving of `uploads/` |
| `POST /api/auth/forgot-password` | a reset token column, an email sender (nodemailer) |
| `PATCH /api/auth/reset-password/:token` | token lookup, expiry check, rehash |

### Frontend, once they exist

- [ ] Profile image upload — `FormData` with field `image`, sent as
      `multipart/form-data`. **Do not set `Content-Type` by hand**; the browser
      must add the multipart boundary itself. Validate type and size in the
      browser first (§39). On success call `refreshUser()` so the profile
      avatar and the fixed navbar avatar both update with no re-login (§22).
- [ ] `app/forgot-password/page.jsx` — email, `POST /api/auth/forgot-password`,
      success message
- [ ] `app/reset-password/[token]/page.jsx` — new password + confirm,
      `PATCH /api/auth/reset-password/:token`, then redirect to `/login`

Until the backend ships these, the `Forgot Password?` link from Phase 8 has no
destination. Leave it linking to a page that says the feature is not available
yet — do not fake a success message.

**Check:** upload a JPEG and watch the navbar avatar change without a refresh;
a 5 MB file is rejected in the browser; a `.txt` renamed to `.jpg` is rejected
by the backend and the message is shown.

---

## Phase 18 — State and responsive sweep `[ ]`

**Goal:** walk every page once, checking only the states.

| Page | Loading | Empty | Error |
|---|---|---|---|
| `/` | skeleton cards | `No blogs found.` | backend message |
| `/blogs/[id]` | skeleton | — | `Blog Not Found` |
| `/dashboard` | spinner | zero blogs reads naturally | backend message |
| `/dashboard/blogs` | skeleton rows | `You haven't created any blogs yet.` | backend message |
| `/admin/users` | skeleton rows | `No users found.` | backend message |

Also confirm across every form:

- The submit button disables while pending and says what it is doing
- No raw JavaScript error text is ever rendered (§31)
- Nothing logs the token to the console

Responsive pass at 375px, 768px and 1280px (§34): the sidebar becomes a drawer,
cards stack, tables scroll inside their own container rather than pushing the
page sideways, and every form fits the viewport.

---

## Phase 19 — Repository hygiene, README, submission `[ ]`

- [ ] `.gitignore` covers `node_modules/`, `.next/`, `.env.local`
- [ ] `.env.example` committed with `NEXT_PUBLIC_API_URL=` and no real value
- [ ] `git status` shows neither `node_modules` nor `.env.local`
- [ ] Screenshots of the major pages (§43): home, blog detail, login, register,
      dashboard, blog list, create blog, profile, change password, admin users
- [ ] README (§44): overview, features, tech stack, install, env table, how to
      run, **the backend dependency and how to start it**, route table, user vs
      admin functionality, screenshots
- [ ] Push, then open the repo URL in a private window to confirm it is public

The README must say the backend has to be running and on which port. A grader
who opens the frontend against a dead API sees an error page and no data.

---

## Quick reference — what lives where when you are done

```
Frontend/
├── app/
│   ├── layout.jsx                     AuthProvider + Navbar + Footer
│   ├── page.jsx                       homepage: list, search, filter
│   ├── login/page.jsx
│   ├── register/page.jsx
│   ├── forgot-password/page.jsx       Phase 17
│   ├── reset-password/[token]/page.jsx Phase 17
│   ├── blogs/[id]/page.jsx            public blog detail
│   ├── dashboard/
│   │   ├── layout.jsx                 auth guard + Sidebar
│   │   ├── page.jsx                   dashboard home
│   │   ├── blogs/
│   │   │   ├── page.jsx               table + delete
│   │   │   ├── create/page.jsx
│   │   │   └── [id]/edit/page.jsx
│   │   ├── profile/page.jsx
│   │   └── change-password/page.jsx
│   └── admin/
│       ├── layout.jsx                 role guard
│       └── users/page.jsx
│
├── components/
│   ├── Navbar.jsx                     fixed, search, ProfileMenu
│   ├── Sidebar.jsx                    role-aware, drawer on mobile
│   ├── ProfileMenu.jsx                avatar dropdown
│   ├── BlogCard.jsx
│   ├── BlogForm.jsx                   shared by create and edit
│   ├── SearchBar.jsx                  debounced
│   ├── CategoryFilter.jsx
│   ├── Loader.jsx
│   └── ConfirmDialog.jsx
│
├── services/
│   ├── auth.service.js
│   ├── user.service.js
│   └── blog.service.js
│
├── contexts/
│   └── AuthContext.jsx                user, loading, login, logout, refreshUser
│
├── utils/
│   ├── api.js                         apiFetch: base url, bearer, error throw
│   └── auth.js                        token get/set/clear, initials helper
│
├── .env.local                         not committed
├── .env.example
├── .gitignore
└── README.md
```

---

## Endpoint coverage checklist

Tick each one only when a real page calls it (§38):

| # | Method | Endpoint | Used by |
|---|---|---|---|
| 1 | POST | `/api/auth/register` | Phase 7 |
| 2 | POST | `/api/auth/login` | Phase 8 |
| 3 | POST | `/api/auth/forgot-password` | Phase 17 `[!]` |
| 4 | PATCH | `/api/auth/reset-password/:token` | Phase 17 `[!]` |
| 5 | GET | `/api/users` | Phase 16 |
| 6 | GET | `/api/users/:id` | Phase 16 |
| 7 | PATCH | `/api/users/:id/status` | Phase 16 |
| 8 | GET | `/api/users/profile` | Phase 2, 14 |
| 9 | PUT | `/api/users/profile/update` | Phase 14 |
| 10 | PATCH | `/api/users/profile/image` | Phase 17 `[!]` |
| 11 | PATCH | `/api/users/password` | Phase 15 |
| 12 | POST | `/api/blogs/create` | Phase 11 |
| 13 | GET | `/api/blogs` | Phase 4, 5, 10, 12 |
| 14 | GET | `/api/blogs/:id` | Phase 6, 13 |
| 15 | PUT | `/api/blogs/update/:id` | Phase 13 |
| 16 | DELETE | `/api/blogs/delete/:id` | Phase 12 |
