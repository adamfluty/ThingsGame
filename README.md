<p align="center">
  <img src="logo.png" alt="ThingsGame Logo" />
</p>

### Things! Game (Realtime Party Game)

Things! Game is a lightweight real‑time party game for in‑person groups. Players submit answers on their own devices while the host runs the game screen to reveal and score.

- **Server**: Node.js, TypeScript, Express, Socket.IO
- **Client**: React, Vite, TailwindCSS, DaisyUI, Zustand

### Features

- Entry page (/) for players to submit name and answers
- Host screen (/game):
  - Live prompt input (broadcasts to all players)
  - Lock & Show to reveal answers; names hidden until an answer is clicked
  - Next Turn cycles through eligible players
  - Clear to reset for next round
  - Sorting toggle (Score vs Play Order) and Randomize Order
  - Light/Dark theme toggle
- Admin screen (/admin):
  - Live edit player names and play order
  - Remove player button

### Install (Debian Bookworm)

Use the provided install script; it installs Node.js 20, dependencies, builds assets, and sets up a systemd service.

```bash
cd /root/ThingsGame
chmod +x install.sh
./install.sh
```

After install:
- Service: `systemctl status thingsgame --no-pager`
- App: open `http://<server-ip>:4000`
- Stop/Start: `systemctl stop|start thingsgame`

### Development

- Start dev servers in two terminals (or use the root `dev` script):
  - Server: `cd server && npm run dev`
  - Client: `cd client && npm run dev`
- Build production artifacts:
  - `npm run build --prefix client && npm run build --prefix server`

### Deployment

Use the unified deploy script to build and update the systemd service:

```bash
./deploy.sh            # Build client+server, write service, start
./deploy.sh --skip-build  # Only update service/restart
./deploy.sh --port 4000   # Change port
```

### Routes

- `/`       Player entry (no password)
- `/game`   Host game screen
- `/admin`  Admin tools

### Environment

- `PORT` (default 4000)

### Notes

- Names lock on first submit; admins can live‑edit names in `/admin`.
- “Lock & Show” switches to “Clear” once locked.
- Next is disabled until locked; the server also ignores “next” before locking.


