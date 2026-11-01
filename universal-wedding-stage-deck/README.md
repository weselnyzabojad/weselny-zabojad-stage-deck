# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

# Universal Wedding Stage Deck ("Weselny Żabojad")

Robust, offline-first PWA event management application built for bilingual/trilingual wedding MCs, DJs, and coordinators (French / Polish / English). 

Designed for high-contrast, low-light stage conditions with a professional French flag color palette (`#002395`, `#FFFFFF`, `#ED2939`) and offline resilience for venues with poor mobile reception.

---

## 🚀 Core Stack
* **Framework:** React 19 + Vite
* **Styling:** Tailwind CSS (v4) with custom typography (Montserrat & Lora)
* **PWA Support:** Vite PWA Plugin (Service Worker & offline caching)
* **Version Control & CI/CD:** GitHub & GitHub Actions

---

## ✨ Key Features
1. **Zero-Scroll Dark Mode Dashboard:** Optimized for Lenovo tablets in landscape mode. Displays cultural hard rules (`Sto Lat`, `Gorzko`, `Bread & Salt`), VIP radar, and live schedule status at a glance.
2. **Dynamic Time-Drift & Elastic Schedule Engine:** Automatically tracks schedule drift (`+25m LATE`, `-15m AHEAD`), recalculates upcoming elastic steps, and protects fixed deadlines (`HARD_ANCHOR` events like sunset photo sessions, videographer departures, or midnight *Oczepiny*).
3. **Multi-Device Cloud Sync & Role Security:** 4-digit room PIN pairing for instant state propagation across devices (Tablet master, DJ booth view, and pocket smartphone clicker) with `localStorage` offline fallback.
4. **Trilingual Script Teleprompter & Cartridge System:** Decoupled architecture where standardized JSON wedding cartridges (`WeddingSchema v1.1`) manage individual wedding schedules, cultural rules, and contact directories.

---

## 🛠️ Project Setup & Local Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/universal-wedding-stage-deck.git](https://github.com/your-username/universal-wedding-stage-deck.git)
   cd universal-wedding-stage-deck
