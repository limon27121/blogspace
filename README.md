# BlogHub — Blog Management Application

A full-stack blogging platform with three access levels — **Guest**, **User**
and **Admin**. Built for the Road To SDET module.

- Guests discover, search, filter and read blogs.
- Users manage their own profile (name, avatar, password) and their own blogs.
- Admins also manage every user and every blog.

![BlogHub homepage](Frontend/Pictures/blog/home.png)

---

## Repository layout

| Folder | What it is | Docs |
|---|---|---|
| [`Backend/`](Backend) | REST API — Node.js, Express, MySQL, Sequelize, JWT | [Backend README](Backend/README.md) |
| [`Frontend/`](Frontend) | Web app — Next.js 16 (App Router), React 19, Tailwind CSS | [Frontend README](Frontend/README.md) |

The frontend has no data of its own: every page reads from the REST API, so
**the backend must be running first**.

---

## Quick start

**Requirements:** Node.js 18+, npm, MySQL.

**1. Clone**

```bash
git clone https://github.com/limon27121/blogspace.git
cd blogspace
```

**2. Backend** — API on `http://localhost:5000`

```sql
CREATE DATABASE Blog;
```

```bash
cd Backend
npm install
cp .env.example .env      # set DB_PASSWORD and a long random SECRET_KEY
npm run dev
```

**3. Frontend** — app on `http://localhost:3000` (in a second terminal)

```bash
cd Frontend
npm install
cp .env.example .env.local
# .env.local:  NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
```

Open http://localhost:3000.

**4. Make an admin (optional)** — no API grants the admin role, by design.
Register an account, then promote it in MySQL and log in again:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Full setup, environment variables, routes, permissions and screenshots are in
the [Frontend README](Frontend/README.md) and the
[Backend README](Backend/README.md).

---

## Testing

The API is covered by Postman collections run with Newman — 78 requests and 492
assertions, all passing. See [Backend README → Testing](Backend/README.md#testing).

---

## Screenshots

| Dashboard | Profile |
|---|---|
| ![Dashboard](Frontend/Pictures/blog/Dashboard.png) | ![Profile](Frontend/Pictures/blog/profile-page.png) |

More in the [Frontend README](Frontend/README.md#screenshots).
