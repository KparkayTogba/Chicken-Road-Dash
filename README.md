# 🐔 Chicken Road Dash

> **Cross the road. Dodge traffic. Survive the chaos.**

A fast-paced arcade game for iOS where timing and reflexes are everything. Tap once to move your chicken — but one wrong step and it's game over. How far can you go?

[![Download on the App Store](https://img.shields.io/badge/App%20Store-Download-black?style=for-the-badge&logo=apple)](https://apps.apple.com)
[![iOS](https://img.shields.io/badge/iOS-15.0%2B-blue?style=for-the-badge&logo=apple)](https://apps.apple.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](./LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0-green?style=for-the-badge)](https://apps.apple.com)

---

## 🌐 Live Site

| Page | URL |
|------|-----|
| 🏠 Homepage | [kparkaytogba.github.io/Chicken-Road-Dash/](https://kparkaytogba.github.io/Chicken-Road-Dash/) |
| 🆘 Support | [/support.html](https://kparkaytogba.github.io/Chicken-Road-Dash/support.html) |
| 🔒 Privacy Policy | [/privacy.html](https://kparkaytogba.github.io/Chicken-Road-Dash/privacy.html) |
| 📋 Terms of Service | [/tos.html](https://kparkaytogba.github.io/Chicken-Road-Dash/tos.html) |

---

## 🎮 Gameplay

- **Swipe or D-pad controls** — move your chicken forward, back, left, and right
- **Dodge oncoming traffic** — cars in 6 lanes coming from both directions
- **Endless levels** — each crossing makes traffic faster and more chaotic
- **3 lives** — lose them all and the run ends
- **Beat your high score** — survive longer, score higher every run

---

## 🖼️ Screenshots

| Hero | Gameplay | Features |
|------|----------|----------|
| ![Hero](screenshots/Screenshot_1_Hero.png) | ![Gameplay](screenshots/Screenshot_2_Gameplay.png) | ![Features](screenshots/Screenshot_3_Features.png) |

> All screenshots are 1242 × 2688px (iPhone 6.5" — App Store ready)

---

## 🛠️ Tech Stack

| Layer | Details |
|-------|---------|
| Platform | iOS 15.0+ |
| Framework | React 19 + Capacitor |
| Build Tool | Vite |
| Animations | Framer Motion |
| Styling | Tailwind CSS |
| Audio | Web Audio API |
| Web Pages | Vanilla HTML + CSS (GitHub Pages) |
| Distribution | Apple App Store |

---

## 📁 Project Structure

```
Chicken-Road-Dash/
│
├── src/
│   ├── App.jsx                   # Core gameplay loop, all game logic
│   ├── components/
│   │   └── ui/                   # Button, Card primitives
│   ├── assets/                   # Images
│   └── sounds/                   # move, hit, level audio
│
├── ios/                          # Capacitor iOS project (open in Xcode)
│   └── App/
│       ├── App.xcodeproj/
│       └── App/
│           ├── Assets.xcassets/  # App icon, splash screen
│           └── AppDelegate.swift
│
├── public/
│   ├── index.html                # 🏠 Marketing landing page
│   ├── hero.png                  # Hero image for landing page
│   ├── support.html              # 🆘 Support & FAQ
│   ├── privacy.html              # 🔒 Privacy Policy
│   ├── tos.html                  # 📋 Terms of Service
│   └── favicon.svg
│
├── .github/workflows/
│   └── deploy.yml                # GitHub Pages auto-deploy
├── index.html                    # App entry point
├── vite.config.js
└── README.md
```

---

## 🚀 Development

```bash
npm install
npm run dev
```

## 📱 Build & Deploy to iOS

```bash
npm run build
npx cap sync ios
# then open ios/App/App.xcworkspace in Xcode
```

---

## 🏠 Homepage

The live site is hosted on GitHub Pages and auto-deploys on every push to `main` via GitHub Actions. To enable:

1. Go to **Settings → Pages**
2. Set Source to **Deploy from a branch** → branch: **`gh-pages`** / folder: **`/ (root)`**
3. Push to `main` — the workflow builds and deploys automatically

---

## 🌐 Support

**Support Page:** [kparkaytogba.github.io/Chicken-Road-Dash/support.html](https://kparkaytogba.github.io/Chicken-Road-Dash/support.html)

**Email:** [kparkaytogba@gmail.com](mailto:kparkaytogba@gmail.com)

For bug reports, please include:
- Your device model (e.g. iPhone 14 Pro)
- iOS version (e.g. iOS 17.4)
- A short description of what happened

---

## 🔒 Privacy

Chicken Road Dash does **not** collect personal information. No account is required. All gameplay data stays on your device. See the full [Privacy Policy](https://kparkaytogba.github.io/Chicken-Road-Dash/privacy.html).

---

## 📄 License

© 2026 Kparkay Togba. All rights reserved.

This project and its assets are proprietary. Unauthorized copying, modification, or distribution is prohibited.

---

## 👤 Developer

**Kparkay Togba**

- 🌐 Portfolio: [kparkaytogba.github.io](https://kparkaytogba.github.io)
- 🐙 GitHub: [@KparkayTogba](https://github.com/KparkayTogba)
- 📧 Email: [kparkaytogba@gmail.com](mailto:kparkaytogba@gmail.com)
