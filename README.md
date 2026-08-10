# Underwater Hand Slice

Underwater Hand Slice is a browser-based Fruit Ninja-style minigame. Slice underwater treasure objects with your index finger using webcam hand tracking, or switch to mouse mode for testing without a camera.

The game runs entirely in the browser. Camera input, hand tracking, and player segmentation are processed locally on your device.

## Current Version

This version includes:

- 60-second timed runs with a pulsing final-10-seconds timer warning
- Larger slice targets
- Faster object spawn pacing
- Transparent underwater-themed good objects: pearl shell, coin, and crystals
- Octopus/bomb hazard objects that remove 1 life when sliced
- Score, high score, lives, combo, level, and timer HUD
- Game Over stats for sliced objects, max combo, bombs hit, and missed objects
- Webcam hand tracking with MediaPipe
- Mouse mode fallback
- Underwater background, bubbles, fish, particles, and effects
- Settings saved in `localStorage`

## Requirements

Install these first:

- Node.js 18 or newer
- npm, which comes with Node.js
- A modern browser such as Chrome, Edge, or Safari
- A webcam if you want hand tracking

Check that Node and npm are installed:

```bash
node -v
npm -v
```

## Run On Mac

Open Terminal, then run:

```bash
cd /Users/hetshah/Documents/Minigame_FruitNinja
npm install
npm run dev
```

Open the local URL Vite prints. It is usually one of these:

```text
http://localhost:5173/
http://localhost:5174/
```

If Vite says `Port 5173 is in use, trying another one`, use the new URL it prints.

Leave Terminal running while you play. Press `Ctrl+C` in Terminal to stop the server.

## Run On Windows

Open Command Prompt or PowerShell, then go to the project folder. Example:

```powershell
cd C:\Users\YOUR_NAME\Documents\Minigame_FruitNinja
npm install
npm run dev
```

Open the local URL Vite prints, usually:

```text
http://localhost:5173/
```

If that port is busy, Vite may print a different URL such as:

```text
http://localhost:5174/
```

Leave the terminal window running while you play. Press `Ctrl+C` to stop the server.

## Build For Production

To make sure the project compiles:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

Then open the local URL Vite prints.

## How To Play

1. Open the game in your browser.
2. Click `Start Game`.
3. Allow camera permission if using hand tracking.
4. Move your index fingertip quickly through good objects to slice them.
5. Avoid octopus/bomb hazards. Slicing one removes 1 life.
6. Score as much as possible before the 60-second timer reaches zero.
7. Use the Game Over screen to review sliced objects, max combo, bombs hit, and missed objects.

The timer highlights and pulses during the final 10 seconds of each run. Mouse mode is available from the menu/settings if you do not want to use the camera.

## Controls

- `Escape`: pause or resume
- `R`: restart after game over
- `M`: toggle music
- `S`: toggle sound effects
- `H`: switch hand or mouse mode when not actively playing

In mouse mode, move the mouse quickly through objects. Clicking is not required.

## Assets

Good slice targets live here:

```text
public/assets/good/
```

Current good images:

```text
public/assets/good/good1.png
public/assets/good/good2.png
public/assets/good/good3.png
```

Bomb images live here:

```text
public/assets/bad/
```

Current bomb images:

```text
public/assets/bad/bomb1.png
public/assets/bad/bomb2.png
```

Underwater scene assets live here:

```text
public/assets/underwater/
```

Sound assets live here:

```text
public/assets/sounds/
```

If you add or rename game objects, update:

```text
src/assetConfig.js
```

Transparent PNG or WebP files are recommended for game objects.

## Camera And Privacy

The browser asks for camera permission only after `Start Game` is pressed. Hand tracking and segmentation run locally in the browser. This project does not use a backend, database, user account, or cloud camera processing.

Camera access normally works on `localhost` or HTTPS. If camera permission fails, run with `npm run dev` and open the localhost URL.

## Troubleshooting

- Camera not appearing: allow camera permission, close other apps using the camera, and use the localhost URL.
- Hand not detected: use good lighting and keep your hand inside the camera view.
- Game does not open: make sure `npm install` has run, then run `npm run dev` again.
- Terminal prompt came back: the dev server stopped. Run `npm run dev` again and leave it running.
- Blank screen: check the browser console and run `npm run build` to confirm the app compiles.
- Images not loading: confirm the file is inside `public/assets/...` and listed in `src/assetConfig.js`.

## Project Structure

```text
Minigame_FruitNinja/
├── public/
│   └── assets/
│       ├── good/
│       ├── bad/
│       ├── underwater/
│       ├── effects/
│       └── sounds/
├── src/
│   ├── main.js
│   ├── game.js
│   ├── gameObject.js
│   ├── handTracking.js
│   ├── personSegmentation.js
│   ├── underwaterScene.js
│   ├── particleSystem.js
│   ├── assetConfig.js
│   ├── audioManager.js
│   ├── collision.js
│   ├── config.js
│   ├── ui.js
│   └── style.css
├── index.html
├── package.json
└── README.md
```
