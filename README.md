# Home Workout

Home Workout is a personal workout tracker with an exercise catalog, guided sessions and progress tracking, built with Next.js and SQLite. It is designed for a single user on localhost or a private network.

The app has no authentication; do not expose it to the public internet without adding access controls.

## Run

```bash
docker compose up -d --build
```

The app listens on `http://127.0.0.1:3050` (localhost only). Data lives in the `homeworkout-data` Docker volume, so rebuilding or restarting the container keeps it.

To reach it from a phone over your Tailscale network, configure Tailscale Serve on the host:

```bash
tailscale serve --bg --https=8445 http://127.0.0.1:3050
tailscale serve --https=8445 off                          # stop exposing it
```

In Safari on the phone, Share > Add to Home Screen gives it an app icon and full-screen launch.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000, data in ./data
```

In dev, `localStorage.fastTimers = "1"` in the browser console runs session timers at 10x.

