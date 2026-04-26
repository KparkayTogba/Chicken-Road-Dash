# Chicken Road Dash

A mobile-first arcade game built with React, Vite, and Capacitor. Guide your chicken across six lanes of traffic to reach the finish line — each crossing speeds the cars up.

## Gameplay

- Swipe or use the D-pad to move the chicken
- Dodge cars across 6 traffic lanes
- Reach the **Finish** row to score and advance levels
- You have 3 lives — lose them all and it's game over
- Traffic speeds up 12% every level

## Controls

| Input | Action |
|-------|--------|
| Swipe | Move (mobile) |
| D-pad buttons | Move (touch) |
| Arrow keys / WASD | Move (desktop) |
| R | Restart |
| Space | Start game |

## Tech Stack

- **React 19** + **Vite** — UI and build
- **Framer Motion** — animations
- **Tailwind CSS** — styling
- **Capacitor** — iOS native wrapper
- Web Audio API — sound effects
- Navigator Vibrate API — haptics (Android)

## Project Structure

```
src/
  App.jsx          # main game component (all game logic + rendering)
  components/
    ui/            # shadcn/ui primitives (Button, Card)
  assets/          # images
ios/               # Capacitor iOS project (open in Xcode to build)
```

## Development

```bash
npm install
npm run dev
```

## Build & Deploy to iOS

```bash
npm run build
npx cap sync ios
# then open ios/App/App.xcworkspace in Xcode
```

## Links

| Page | URL |
|------|-----|
| Home | https://kparkaytogba.github.io/Chicken-Road-Dash/ |
| Support | https://kparkaytogba.github.io/Chicken-Road-Dash/support.html |
| Privacy Policy | https://kparkaytogba.github.io/Chicken-Road-Dash/privacy.html |
| Terms of Service | https://kparkaytogba.github.io/Chicken-Road-Dash/tos.html |

## Scoring

| Action | Points |
|--------|--------|
| Move forward one row | +5 |
| Complete a crossing | +100 × level |
