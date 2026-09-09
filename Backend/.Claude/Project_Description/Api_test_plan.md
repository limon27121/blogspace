# API Test Plan — Blog Management REST API

Test plan for the 13 endpoints in `Submission_Procedure.md`. Written to be
implemented as Postman tests, one endpoint at a time, in the order below.

The aim is a **small set of assertions that would actually catch a regression**.
A test that only checks `status === 200` passes even when the API returns the
wrong user's data. Every case here asserts something that would break if the
behaviour changed.

---

## 1. Before writing any test

### Collection variables

| Variable | Value | Set by |
|---|---|---|
| `Base_Url` | `http://localhost:5000` | manually, no trailing slash |
| `admin-token` | — | admin login script |
| `user-token` | — | user login script |
| `userId` | — | register/login script |
| `blogId` | — | create blog script |

Ids and tokens must be **captured from responses**, never typed in. A test that
hardcodes `/api/users/2` breaks the moment the database is reseeded.

### Token capture script

On both login requests, **Scripts → Post-response**:

```js
const body = pm.response.json();
if (body.token) {
    pm.collectionVariables.set("admin-token", body.token);
}
```

Guard with `if (body.token)`. Without it, a failed login writes `undefined` into
the variable and every later request fails with a confusing 401.

### Test data

Three accounts are needed to cover the ownership rules:

| Account | Purpose |
|---|---|
| admin | `admin@example.com` / `password123`, role `admin` |
| user A | owns a blog |
| user B | a second normal user, used to prove A's blog is protected from B |

User B is what makes the 403 tests meaningful. Without a second normal user
there is no way to tell "the owner may edit" from "anyone may edit".

### Run order

Tests depend on each other. Run the collection in this order:

1. Register user A → captures `userId`
2. Login admin → captures `admin-token`
3. Login user A → captures `user-token`
4. Everything else

---

## 2. Assertions that belong on every request

Add these to each request rather than writing them once and forgetting them:

| Assertion | Why it matters |
|---|---|
| Status code is the expected one | the base check |
| `Content-Type` is `application/json` | an HTML error page also has a status code |
| Response has a `message` string | the API's contract is `{ message, data }` |
| Response body contains no `"password"` | a single leak anywhere fails the security requirement |
| Response time under ~1000 ms | catches an accidental N+1 or a missing index |

The password check as a one-liner:

```js
pm.test("no password field in response", function () {
    pm.expect(pm.response.text()).to.not.include('"password"');
});
```

Run it on **every** endpoint, not only the user ones. A blog response includes
an author object, and that is exactly where a leak would appear.

---

## 3. Endpoint test cases

Each table: the test case title goes in Postman as the request name or the
`pm.test` label. Keep the titles readable as a sentence — a failing test should
explain itself without opening the request.

---

### 1. `POST /api/auth/register` — Public

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 1.1 | Register a new user with valid data returns 201 | firstname, email, password | status 201; `data.id` exists; `data.email` equals the sent email |
| 1.2 | Newly registered user defaults to role user and active | same as 1.1 | `data.role === "user"`; `data.isActive === true` |
| 1.3 | Registration response never returns the password | same as 1.1 | body has no `password` key; body does not contain `$2b$` |
| 1.4 | Register without lastname succeeds | omit lastname | status 201; `data.lastname === null` |
| 1.5 | Register with a missing required field returns 400 | no password | status 400; message `firstname, email and password are required` |
| 1.6 | Register with an invalid email format returns 400 | `email: "not-an-email"` | status 400; message mentions valid email |
| 1.7 | Register with a password under 6 characters returns 400 | `password: "123"` | status 400; message `password must be at least 6 characters` |
| 1.8 | Register with an already used email returns 409 | reuse 1.1's email | status 409; message `email already registered` |
| 1.9 | A user cannot register themselves as admin | send `"role": "admin"` | status 201; `data.role === "user"` |

**1.9 is the important one.** It is a privilege escalation test, and it is the
case a careless implementation fails while every other test still passes.

---

### 2. `POST /api/auth/login` — Public

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 2.1 | Login with valid credentials returns a token | valid email + password | status 200; `token` is a non-empty string; token has 3 dot-separated parts |
| 2.2 | Login response contains the user without the password | valid | `data.id`, `data.email`, `data.role` present; no `password` |
| 2.3 | Token payload carries the id and role | valid | decode the payload; `id` matches `data.id`; `role` matches `data.role` |
| 2.4 | Login with a wrong password returns 401 | correct email, wrong password | status 401; message `invalid email or password` |
| 2.5 | Login with an unregistered email returns 401 | unknown email | status 401; **same message as 2.4** |
| 2.6 | Login as a deactivated user returns 403 | account with `isActive: false` | status 403; message `this account has been deactivated` |
| 2.7 | Login without credentials returns 400 | `{}` | status 400; message `email and password are required` |

**2.4 and 2.5 must assert the identical message.** Different messages would let
an attacker discover which emails are registered. Asserting they match is what
makes this a security test rather than two duplicate checks.

Decoding the token in 2.3:

```js
const payload = JSON.parse(atob(pm.response.json().token.split(".")[1]));
pm.expect(payload.role).to.eql("user");
```

---

### 3. `GET /api/users` — Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 3.1 | Admin can list all users | `admin-token` | status 200; `data` is an array; length ≥ 1 |
| 3.2 | User list never exposes passwords | `admin-token` | raw body contains no `"password"` and no `$2b$` |
| 3.3 | Each user object has the expected shape | `admin-token` | first item has `id`, `firstname`, `email`, `role`, `isActive` |
| 3.4 | Request without a token returns 401 | no Authorization header | status 401; message `authorization token is required` |
| 3.5 | Normal user cannot list users | `user-token` | status 403; message `admin access required` |

3.4 and 3.5 are different failures — missing credentials versus insufficient
rights — and asserting the distinct status codes proves the middleware chain
runs in the right order.

---

### 4. `GET /api/users/:id` — Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 4.1 | Admin can fetch a user by id | `/users/{{userId}}` | status 200; `data.id` equals `userId` |
| 4.2 | Fetched user has no password field | same | no `"password"` in body |
| 4.3 | Non-existent id returns 404 | `/users/999999` | status 404; message `user not found` |
| 4.4 | Non-numeric id returns 400 | `/users/abc` | status 400; message `user id must be a positive integer` |
| 4.5 | Normal user cannot fetch another user | `user-token` | status 403 |

4.3 versus 4.4 is the distinction between "valid request, no such row" and
"the request itself is malformed". Both are commonly implemented as one code.

---

### 5. `PATCH /api/users/:id/status` — Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 5.1 | Admin can deactivate a user | `{ "isActive": false }` | status 200; `data.isActive === false`; message `user deactivated` |
| 5.2 | A deactivated user can no longer log in | login as that user | status 403; message `this account has been deactivated` |
| 5.3 | Admin can reactivate a user | `{ "isActive": true }` | status 200; `data.isActive === true` |
| 5.4 | Reactivated user can log in again | login as that user | status 200; token returned |
| 5.5 | Non-boolean isActive returns 400 | `{ "isActive": "yes" }` | status 400; message `isActive must be true or false` |
| 5.6 | Normal user cannot change a status | `user-token` | status 403 |
| 5.7 | Admin cannot deactivate their own account | admin's own id | status 400 |

**5.1 → 5.2 → 5.3 → 5.4 is one chain, and it is the most valuable sequence in
the plan.** It proves the flag is not merely stored but actually enforced at
login. Asserting `data.isActive === false` alone would pass even if login
ignored the column completely.

Reactivating in 5.3 also leaves the data clean for later runs.

---

### 6. `GET /api/users/profile` — User/Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 6.1 | Logged-in user can read their own profile | `user-token` | status 200; `data.id` equals the id in the token |
| 6.2 | Profile response excludes the password | `user-token` | no `"password"` in body |
| 6.3 | Profile request without a token returns 401 | no header | status 401 |
| 6.4 | Admin token returns the admin's own profile, not a list | `admin-token` | status 200; `data.role === "admin"`; `data` is an object, not an array |

6.1 must compare against the **token's** id, not a hardcoded number. That is
the assertion that would fail if the endpoint accidentally returned the first
row in the table instead of the caller's own.

---

### 7. `PUT /api/users/profile/update` — User/Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 7.1 | User can update their own firstname and lastname | `{ firstname, lastname }` | status 200; both fields equal what was sent |
| 7.2 | Update persists after a re-read | then `GET /users/profile` | the new values come back |
| 7.3 | Sending role is rejected with 403 | `{ "role": "admin" }` | status 403; message mentions role |
| 7.4 | Sending isActive is rejected with 403 | `{ "isActive": false }` | status 403 |
| 7.5 | Role is unchanged after a rejected attempt | then `GET /users/profile` | `data.role === "user"` |
| 7.6 | Empty body returns 400 | `{}` | status 400 |
| 7.7 | Blank firstname returns 400 | `{ "firstname": "  " }` | status 400 |
| 7.8 | Updating to an email owned by another user returns 409 | user B's email | status 409; message `email already registered` |
| 7.9 | Invalid email format returns 400 | `{ "email": "nope" }` | status 400 |

**7.5 is the assertion most people leave out.** A 403 alone does not prove the
database was untouched. Re-reading the profile is what turns 7.3 into a real
security test.

---

### 8. `PATCH /api/users/password` — User/Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 8.1 | User can change their own password | `{ "password": "newPassword123" }` | status 200; message `password updated` |
| 8.2 | Password response never contains a hash | same | body has no `$2b$` and no `password` key |
| 8.3 | Old password no longer works | login with the old one | status 401 |
| 8.4 | New password works | login with the new one | status 200; token returned |
| 8.5 | Password shorter than 6 characters is rejected | `{ "password": "abc" }` | status 400 |
| 8.6 | Missing password field returns 400 | `{}` | status 400 |
| 8.7 | Password change without a token returns 401 | no header | status 401 |

**8.3 and 8.4 together are the actual test.** 8.1 passing on its own would still
be true if the handler returned 200 and saved nothing.

After this runs, update the login request's stored password, or run 8.x last —
otherwise every later test logs in with a password that no longer exists.

---

### 9. `POST /api/blogs/create` — User/Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 9.1 | User can create a blog | valid title, blog, category | status **201**; `data.id` exists; save it to `blogId` |
| 9.2 | Created blog belongs to the authenticated user | valid | `data.userId` equals the id in the token |
| 9.3 | A client-supplied userId is ignored | add `"userId": <user B's id>` | status 201; `data.userId` is still **A's** id |
| 9.4 | Blog cannot be created without a token | no header | status 401 |
| 9.5 | Empty blogTitle returns 400 | `blogTitle: "  "` | status 400; message `blogTitle cannot be empty` |
| 9.6 | Missing category returns 400 | omit category | status 400 |

**9.3 is the ownership-spoofing test.** It is the blog equivalent of 1.9, and
the same class of bug: trusting a field from the request body instead of the
token.

Note the status is 201, not 200. A create returning 200 is a common slip.

---

### 10. `GET /api/blogs` — Public

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 10.1 | Guest can list blogs without a token | no Authorization header | status 200; `data` is an array |
| 10.2 | Each blog includes an author object | no header | `data[0].author` exists |
| 10.3 | Author exposes only id, firstname and lastname | no header | `Object.keys(data[0].author)` is exactly those three |
| 10.4 | Public blog list leaks no email or password | no header | raw body contains neither `"email"` nor `"password"` |
| 10.5 | Search by partial title returns matching blogs | `?title=play` | status 200; every returned `blogTitle` contains "play", case-insensitive |
| 10.6 | Filter by category returns only that category | `?category=Testing` | every returned `category === "Testing"` |
| 10.7 | Title and category filters combine | `?title=play&category=Testing` | every item satisfies both |
| 10.8 | A search with no matches returns 200 and an empty array | `?title=zzzzz` | status 200; `data.length === 0`; **not** 404 |

**10.3 must assert the exact key set**, not merely that `firstname` is present.
Checking presence would pass even if `email` and `password` were included too.

**10.5 must loop over the results**, not just check the array is non-empty:

```js
pm.response.json().data.forEach(function (blog) {
    pm.expect(blog.blogTitle.toLowerCase()).to.include("play");
});
```

An assertion of `data.length > 0` would pass even if the filter were ignored
entirely and every blog came back.

**10.8 asserts a non-404.** An empty search result is a successful search.

---

### 11. `GET /api/blogs/:id` — Public

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 11.1 | Guest can read a single blog | `/blogs/{{blogId}}` | status 200; `data.id` equals `blogId` |
| 11.2 | Single blog includes the safe author fields | same | `data.author` has exactly `id`, `firstname`, `lastname` |
| 11.3 | Non-existent blog returns 404 | `/blogs/999999` | status 404; message `blog not found` |
| 11.4 | Non-numeric blog id returns 400 | `/blogs/abc` | status 400 |

---

### 12. `PUT /api/blogs/update/:id` — User/Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 12.1 | Owner can update their own blog | `user-token`, A's blog | status 200; the changed field matches what was sent |
| 12.2 | Another user cannot update someone else's blog | B's token, A's blog | status 403; message `You are not authorized to update this blog.` |
| 12.3 | The blog is unchanged after a rejected update | then `GET /blogs/:id` | the title is still A's original |
| 12.4 | Admin can update any user's blog | `admin-token`, A's blog | status 200 |
| 12.5 | Updating a non-existent blog returns 404 | `/update/999999` | status 404 |
| 12.6 | Update without a token returns 401 | no header | status 401 |
| 12.7 | The blog's author cannot be reassigned | send `"userId": <B's id>` | status 200; `data.userId` unchanged |

12.2 and 12.4 are the pair that proves the rule is "owner **or** admin" rather
than "anyone with a token". Testing only 12.1 would pass on a broken
implementation with no ownership check at all.

12.5 must return 404, not 403 — answering 403 for an id that does not exist
would tell a caller which ids are real.

---

### 13. `DELETE /api/blogs/delete/:id` — User/Admin

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| 13.1 | Another user cannot delete someone else's blog | B's token, A's blog | status 403 |
| 13.2 | The blog still exists after a rejected delete | `GET /blogs/:id` | status 200 |
| 13.3 | Owner can delete their own blog | `user-token`, own blog | status 200; `data.id` matches |
| 13.4 | A deleted blog is really gone | `GET /blogs/:id` | status 404 |
| 13.5 | Deleting an already deleted blog returns 404 | repeat 13.3 | status 404 |
| 13.6 | Admin can delete any user's blog | `admin-token`, a blog owned by A | status 200 |
| 13.7 | Delete without a token returns 401 | no header | status 401 |

**13.2 and 13.4 are what make this suite trustworthy.** A delete endpoint that
returns 200 and deletes nothing, or one that returns 403 but deletes anyway,
both pass a status-code-only test.

Order matters: run the negative cases (13.1, 13.2) before the destructive ones,
and create a throwaway blog for 13.6 so the suite can be re-run.

---

## 4. Cross-cutting cases

Not tied to one endpoint, worth one folder of their own:

| # | Test case title | Request | Key assertions |
|---|---|---|---|
| C.1 | Unknown route returns 404 | `GET /api/nope` | status 404; message `route not found` |
| C.2 | Malformed JSON body returns 400 | raw body `{ bad json` | status 400, **not** 500 |
| C.3 | An expired or tampered token returns 401 | change one character in the token | status 401; message `invalid or expired token` |
| C.4 | A header without the Bearer prefix returns 401 | `Authorization: {{token}}` | status 401 |
| C.5 | No error response leaks a stack trace | any 4xx/5xx | body contains no `at `, no `node_modules`, no `SELECT ` |

C.3 is easy to write and rarely written: take a valid token, change its last
character, and confirm the signature check rejects it. It proves the server
verifies the signature instead of merely decoding the payload.

---

## 5. Implementation order

Work down the list, one endpoint per sitting. Each builds on the tokens and ids
captured by the earlier ones.

1. Register + Login (1, 2) — nothing else runs without tokens
2. Profile reads (6) — the simplest authenticated case
3. Admin user endpoints (3, 4, 5) — introduces role checks
4. Profile writes (7, 8) — introduces the field allow-list
5. Blog create (9) — introduces ownership
6. Public blog reads (10, 11) — introduces query filters
7. Blog update and delete (12, 13) — the full ownership matrix
8. Cross-cutting (C.1–C.5)

## 6. Rules of thumb used throughout

- **Assert data, not just status.** `status === 200` is the weakest possible
  assertion. Every case here also checks a field.
- **Verify with a second request.** After a rejected write, read the record back
  and prove it did not change. After a delete, prove it is gone.
- **Loop over collections.** A filter test must check every returned item, not
  just that something came back.
- **Assert the exact key set** where the requirement is "must not expose". A
  presence check cannot catch an extra field.
- **Use captured variables.** Hardcoded ids make a suite that only runs once.
- **Keep the suite re-runnable.** Reactivate what you deactivate, and create
  throwaway rows for the destructive cases.
