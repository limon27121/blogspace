# Dockerizing the Blog Management Application

A learning-first plan. Part 1 teaches Docker from zero. Part 2 maps that
knowledge onto *this* project. Part 3 is the command reference you will keep
coming back to. Nothing here is executed yet — this is the map, not the drive.

---

## 0. What this project looks like today

| Piece | Tech | Port | Talks to |
|---|---|---|---|
| `Backend/` | Node 22 (ESM), Express 4, Sequelize + mysql2 | 5000 | MySQL |
| `Frontend/` | Next.js 16, React 19, Tailwind 4 | 3000 | Backend HTTP API |
| Database | MySQL 8, schema `Blog` | 3306 | — |

Facts that will shape every decision below:

- `Backend/server.js` calls `process.exit(1)` when the DB is unreachable. In
  Docker the DB starts *slower* than the API, so startup ordering matters.
- `Backend/app.js` serves uploaded files from `Backend/uploads/` via
  `express.static`. Those files are user data — they must survive a container
  being deleted.
- `Frontend/.env.local` holds `NEXT_PUBLIC_API_URL`. Anything prefixed
  `NEXT_PUBLIC_` is **inlined into the JavaScript bundle at build time**, not
  read at runtime. This is the single most common Docker mistake with Next.js.
- `DB_SYNC=true` makes Sequelize alter tables on every boot.
- CORS is driven by `CORS_ORIGIN`.

---

# PART 1 — LEARNING DOCKER

## 1.1 The problem Docker solves

Right now, running this app on a new machine means: install Node 22, install
MySQL 8, create the `Blog` schema, create a user, copy two `.env` files, run
`npm install` twice, start three things in the right order. Every step is a
place where "works on my machine" is born.

Docker packages the application **together with its operating system
dependencies** into a single artifact. The artifact runs identically on your
Windows laptop, a colleague's Mac, and a Linux server.

**Docker is not a virtual machine.** A VM boots a whole guest OS (its own
kernel, GBs of RAM). A container is just a set of isolated processes sharing
the *host* kernel, with their own filesystem, network stack, and process
table. That is why a container starts in milliseconds and a VM takes a minute.

> On Windows there *is* a Linux VM underneath (WSL 2) because containers here
> are Linux containers and need a Linux kernel. Docker Desktop manages that VM
> for you. It explains why file access to `F:\...` from inside a container is
> slower than from inside WSL — the I/O crosses the VM boundary.

## 1.2 The five nouns

Learn these five and 90% of Docker is vocabulary you already have.

**1. Dockerfile** — a text recipe. "Start from Node 22, copy these files, run
npm install, launch this command." Source code, committed to git.

**2. Image** — the built result of a Dockerfile. Read-only, immutable,
layered. Think: a class in OOP, or an ISO file. Named `myapp:1.0` where `1.0`
is the tag.

**3. Container** — a running instance of an image. Think: an object of that
class. You can start 10 containers from 1 image. A container has a writable
layer on top of the image; **when the container is deleted, that layer dies
with it.** This is why databases need volumes.

**4. Volume** — storage that lives outside the container's lifecycle. Two
kinds:
  - *Named volume* — Docker manages the location. Best for database data.
    `mysql_data:/var/lib/mysql`
  - *Bind mount* — maps a real host folder into the container.
    `./Backend:/app`. Best for development hot-reload, and for the `uploads/`
    folder if you want to see the files in Explorer.

**5. Network** — a private virtual LAN. Containers on the same network reach
each other **by service name as a hostname**. This is the key insight for this
project: the backend will connect to `DB_HOST=mysql`, not `localhost`.
Inside a container, `localhost` means *that container itself*.

## 1.3 Layers and the build cache — why order matters

Every instruction in a Dockerfile creates a layer. Docker caches layers and
reuses them if nothing above changed. Change one line of source code and only
the layers *after* the copy are rebuilt.

This is why the dependency install is always split from the source copy:

```dockerfile
COPY package*.json ./     # layer A - changes rarely
RUN npm ci                # layer B - expensive, cached as long as A is unchanged
COPY . .                  # layer C - changes on every edit
```

If you wrote `COPY . .` before `RUN npm ci`, every single code edit would
invalidate the cache and re-download every npm package. A 2-second rebuild
becomes a 90-second one.

## 1.4 Multi-stage builds

A build needs devDependencies, compilers, source files. A *runtime* needs
almost none of that. Multi-stage lets you build in a fat image and copy only
the artifact into a slim final image.

```dockerfile
FROM node:22-alpine AS builder
# ...install everything, build...

FROM node:22-alpine AS runner
COPY --from=builder /app/.next/standalone ./
# devDependencies, source, build tools: all left behind
```

Result for the frontend: roughly 1.2 GB down to roughly 180 MB. Smaller image
= faster deploys, smaller attack surface.

## 1.5 Docker Compose — why single containers are not enough

`docker run` handles one container. This project needs three, plus a network,
plus a volume, plus start ordering, plus environment variables. Doing that by
hand is a 6-command ritual you would get wrong weekly.

`docker-compose.yml` declares the whole system in one file, and
`docker compose up` makes reality match the file. It is declarative: you
describe the desired end state, Docker works out what to create, recreate, or
leave alone.

## 1.6 Image vs container lifecycle

```
  Dockerfile
      |  docker build
      v
   IMAGE  ---------------------------> registry (docker push / pull)
      |  docker run / compose up
      v
  CONTAINER  --(docker stop)-->  STOPPED  --(docker start)--> RUNNING
      |                              |
      |  docker rm                   |  docker rm
      v                              v
   GONE  (writable layer destroyed; volumes survive)
```

Three rules worth memorising:

1. **Rebuilding an image does not update running containers.** You must
   recreate them (`docker compose up --build`).
2. **Deleting a container deletes its writable layer.** Anything not on a
   volume is gone.
3. **Volumes survive `docker compose down`.** They only die with
   `docker compose down -v` — the `-v` is the dangerous flag.

## 1.7 The environment-variable rule you must not get wrong

| Variable | When it is read | Consequence |
|---|---|---|
| Backend `DB_HOST`, `SECRET_KEY`, ... | at **runtime**, by `process.env` | put in compose `environment:` / `env_file:` — change without rebuilding |
| Frontend `NEXT_PUBLIC_API_URL` | at **build time**, inlined into the bundle by Next.js | must be a Docker **build arg**. Setting it only in `environment:` silently produces a frontend that calls `undefined/api` |

## 1.8 `.dockerignore` — not optional

Without it, `COPY . .` ships `node_modules/` (host-built, possibly wrong
platform binaries — `bcrypt` compiles native code), `.next/`, `.git/`, and
**your `.env` with real secrets baked into a distributable image layer**.
Layers are readable by anyone who has the image; a secret deleted in a later
layer is still present in the earlier one.

---

# PART 2 — THE PLAN FOR THIS PROJECT

## 2.1 Target architecture

```
                   Host (your Windows machine)
   browser :3000                 :5000                 :3307 (optional)
        |                          |                     |
  ------|--------------------------|---------------------|--------
        v                          v                     v
   [ frontend ]  --HTTP-->   [ backend ]  --TCP-->   [  mysql  ]
    next start              node server.js           mysql:8.0
     port 3000                port 5000                port 3306
        |                          |                     |
        +----------- docker network: blog-net -----------+
                                   |                     |
                            volume: uploads      volume: mysql_data
```

- The browser talks to the backend on `http://localhost:5000/api` — the
  browser runs on the *host*, not in the network, so it uses published ports.
- The backend talks to MySQL on `mysql:3306` — service name as hostname.
- MySQL's port is published to host `3307` only so you can attach Workbench /
  DBeaver without colliding with a MySQL you may already have on 3306.

## 2.2 Files to create

```
Blog-Management-Application/
├── docker-compose.yml            # production-ish: build images, run all three
├── docker-compose.dev.yml        # override: bind mounts + hot reload
├── .env                          # compose-level secrets (git-ignored)
├── .env.example                  # committed template
├── Backend/
│   ├── Dockerfile
│   └── .dockerignore
└── Frontend/
    ├── Dockerfile
    └── .dockerignore
```

## 2.3 Phase-by-phase execution order

Each phase ends in something you can verify. Do not start the next until the
current one is green.

### Phase 1 — MySQL alone

Add only the `mysql` service to `docker-compose.yml`, with a named volume and
a healthcheck. Keep running the backend and frontend on the host with
`npm run dev`, pointing `DB_HOST=localhost`, `DB_PORT=3307`.

*Verify:* `docker compose ps` shows `healthy`; the host backend connects and
`Database synced` prints.

*Why first:* it isolates the database work. If this breaks later, you know it
is not the database.

### Phase 2 — Backend image

Write `Backend/Dockerfile` and `Backend/.dockerignore`. Single stage, Node 22
Alpine, `npm ci --omit=dev`, non-root user, `CMD ["node", "server.js"]`.
Add the service to compose with `depends_on: mysql: condition: service_healthy`.
Mount `uploads` as a volume. Switch `DB_HOST` to `mysql`, `DB_PORT` to `3306`.

*Verify:* `curl http://localhost:5000/api/blogs` from the host returns JSON.
Run the Postman/Newman collection against it.

*Watch out:* `bcrypt` on Alpine. If the install fails on musl, either switch
the base to `node:22-slim` (Debian) or add `RUN apk add --no-cache python3
make g++` to the build. Deciding this is part of the phase.

### Phase 3 — Frontend image

Add `output: "standalone"` to `next.config.mjs` first — it makes Next emit a
self-contained server with only the needed `node_modules`, which is what makes
the multi-stage copy possible.

Three stages: `deps` (npm ci) → `builder` (npm run build, with
`ARG NEXT_PUBLIC_API_URL`) → `runner` (copy `.next/standalone`,
`.next/static`, `public`; run `node server.js`).

*Verify:* browse `http://localhost:3000`, log in, create a blog, upload a
profile image. The upload proves the frontend → backend → volume path end to
end.

*Watch out:* this is where `NEXT_PUBLIC_API_URL` bites. It must be passed as
`build: args:` in compose, not only `environment:`.

### Phase 4 — Dev override with hot reload

`docker-compose.dev.yml` bind-mounts `./Backend:/app` and `./Frontend:/app`,
masks `node_modules` with an anonymous volume (`/app/node_modules`) so the
container's Linux-built modules are not shadowed by your Windows ones, and
swaps the command to `npm run dev`.

*Watch out:* file-change events do not always cross the Windows→WSL boundary.
If nodemon or Next does not reload, set `WATCHPACK_POLLING=true` and
`CHOKIDAR_USEPOLLING=true`.

### Phase 5 — Hardening and polish

- Backend healthcheck endpoint (`GET /api/health`) so compose can gate on it.
- `restart: unless-stopped` on all services.
- Set `DB_SYNC=false` in the production env once the schema is settled.
- Pin image digests, or at least exact tags (`mysql:8.0.40`, not `mysql:8`).
- Non-root `USER` in both Dockerfiles.
- Optional: a `newman` service that runs the Postman collection against the
  composed stack — Docker-based integration testing, directly relevant to
  SDET work.

## 2.4 Project-specific decisions, with reasons

| Decision | Choice | Reason |
|---|---|---|
| Base image | `node:22-alpine` (fall back to `-slim`) | matches host Node 22; Alpine is ~50 MB vs ~350 MB. Fall back if `bcrypt` refuses to build |
| MySQL | `mysql:8.0` official | Sequelize `mysql2` dialect targets it; `MYSQL_DATABASE=Blog` auto-creates the schema on first boot |
| DB data | named volume `mysql_data` | must outlive containers; also avoids Windows bind-mount permission pain for MySQL's data dir |
| `uploads/` | named volume (or bind mount in dev) | user data. A bare container would lose every avatar on rebuild |
| Start order | `depends_on` + `condition: service_healthy` | plain `depends_on` only waits for *start*, not *readiness*; `server.js` exits on a failed connect |
| Extra safety | `restart: unless-stopped` | if the backend still loses a race, Docker restarts it instead of leaving the stack half-dead |
| `DB_SYNC` | `true` in dev, `false` in prod | `alter` on every boot is a production hazard |
| `CORS_ORIGIN` | stays `http://localhost:3000` | CORS is judged by the **browser's** view of the origin, not the container's |
| MySQL host port | `3307:3306` | avoids clashing with a MySQL already installed on Windows |
| Secrets | root `.env`, git-ignored, `.env.example` committed | never `COPY` a real `.env` into an image layer |

## 2.5 Known traps in this specific codebase

1. **`server.js` has no retry.** One failed connect and the process is gone.
   Healthcheck-gated `depends_on` plus a restart policy covers it. A retry
   loop in `connectDB` would be the cleaner long-term fix.
2. **`Backend/uploads/` currently holds a real file.** It is git-ignored, so it
   will not be in the build context. Confirm the volume is mounted *before*
   testing profile images, or existing avatars 404.
3. **`.env` is listed in `Backend/.gitignore` but sits on disk.** The
   `.dockerignore` must exclude it independently — `.gitignore` does not
   affect the Docker build context.
4. **The DB is shared with the `Class_Lecture` project** (per the comment in
   `server.js`). A Dockerised MySQL is a *fresh empty* database — that sharing
   ends the moment you containerise, and `sync({ alter: { drop: false } })`
   will create the tables from scratch. Decide whether to dump and import the
   existing data.
5. **Next.js 16 standalone output** requires `.next/static` and `public/` to
   be copied separately; the standalone folder does not include them. Missing
   that gives an unstyled page with broken images.
6. **`bcrypt` is a native module.** Never let a host-built `node_modules` leak
   into the image — Windows binaries do not run on Linux. `.dockerignore` and
   the anonymous-volume trick both exist for this.

---

# PART 3 — COMMAND REFERENCE

## 3.1 Daily driver (Compose)

```bash
docker compose up -d                 # start everything, detached
docker compose up --build            # rebuild images, then start (after code change)
docker compose ps                    # what is running, health status, ports
docker compose logs -f backend       # follow one service's logs
docker compose logs --tail=100       # last 100 lines, all services
docker compose stop                  # stop, keep containers
docker compose start                 # start them again
docker compose restart backend       # restart one service
docker compose down                  # stop AND delete containers + network
docker compose down -v               # ...AND delete volumes. DESTROYS THE DATABASE
docker compose exec backend sh       # shell inside a RUNNING container
docker compose run --rm backend sh   # one-off throwaway container
docker compose config                # print the fully merged/resolved config
docker compose -f docker-compose.yml -f docker-compose.dev.yml up   # dev mode
```

> **Warning:** `docker compose down -v` is the one command that loses data. The
> `-v` removes the named volumes, including `mysql_data` and `uploads`. Use
> plain `down` unless you specifically intend to wipe the database.

## 3.2 Images

```bash
docker build -t blog-backend:1.0 ./Backend              # build from a Dockerfile
docker build --no-cache -t blog-backend:1.0 ./Backend   # ignore the layer cache
docker images                                    # list local images
docker image inspect blog-backend:1.0            # full metadata as JSON
docker history blog-backend:1.0                  # layer-by-layer size breakdown
docker rmi blog-backend:1.0                      # delete an image
docker tag blog-backend:1.0 user/blog-backend:1.0
docker push user/blog-backend:1.0                # to Docker Hub (after docker login)
docker pull mysql:8.0
```

## 3.3 Containers

```bash
docker ps                     # running containers
docker ps -a                  # including stopped ones
docker run -d -p 5000:5000 --name api blog-backend:1.0
docker logs -f api
docker exec -it api sh        # interactive shell
docker stop api               # SIGTERM, then SIGKILL after 10s
docker rm api                 # delete a stopped container
docker rm -f api              # stop and delete in one go
docker stats                  # live CPU / memory per container
docker inspect api            # everything Docker knows about it
docker cp api:/app/log.txt .  # copy a file out of a container
```

## 3.4 Volumes, networks, cleanup

```bash
docker volume ls
docker volume inspect blog_mysql_data
docker volume rm blog_mysql_data          # permanent
docker network ls
docker network inspect blog-net           # shows which containers are attached

docker system df                          # how much disk Docker is using
docker image prune                        # delete dangling images
docker container prune                    # delete all stopped containers
docker system prune -a                    # delete everything unused. Aggressive
```

> **Warning:** `docker system prune -a` removes every image not currently used
> by a container, plus the build cache. It frees a lot of disk and costs a lot
> of rebuild time. It does not touch named volumes unless you add `--volumes`.

## 3.5 Debugging recipes

```bash
# Container exits immediately - read the last words before it died
docker compose logs backend

# Is the DB actually reachable from inside the backend container?
docker compose exec backend sh -c "nc -zv mysql 3306"

# Open a MySQL shell inside the db container
docker compose exec mysql mysql -uroot -p Blog

# What env vars does the running container actually see?
docker compose exec backend env | sort

# Inspect a failing build: shell into the last successful stage
docker build --target builder -t debug-img ./Frontend
docker run --rm -it debug-img sh

# Port already in use on the host
netstat -ano | findstr :5000     # Windows: find the PID holding it
```

## 3.6 Command lifecycle cheat sheet

```
write Dockerfile
   -> docker build                   -> image created
   -> docker compose up -d           -> containers created + started
   -> docker compose logs -f         -> watch it boot
   -> edit source
   -> docker compose up -d --build   -> rebuild image, recreate container
   -> docker compose down            -> containers gone, volumes kept
   -> docker compose down -v         -> volumes gone too (data destroyed)
```

---

## 4. Learning checkpoints

Before moving on, you should be able to answer these without looking:

1. Why does the backend use `DB_HOST=mysql` instead of `localhost`?
2. Why does `NEXT_PUBLIC_API_URL` need to be a build arg and not a runtime env?
3. What is lost when you run `docker compose down`? What is lost with `-v`?
4. Why is `COPY package*.json ./` a separate line from `COPY . .`?
5. Why is `node_modules` in `.dockerignore` when `bcrypt` is a dependency?
6. What does `depends_on: condition: service_healthy` give you that plain
   `depends_on` does not?

---

## 5. What happens next

This document is the theory and the route. When you say go, implementation
follows the phase order in §2.3 — one phase at a time, each verified before
the next starts:

1. Phase 1: `docker-compose.yml` with MySQL only.
2. Phase 2: `Backend/Dockerfile` + `.dockerignore`, backend service.
3. Phase 3: `next.config.mjs` standalone + `Frontend/Dockerfile`, frontend service.
4. Phase 4: `docker-compose.dev.yml` for hot reload.
5. Phase 5: healthcheck endpoint, restart policies, optional Newman service.
