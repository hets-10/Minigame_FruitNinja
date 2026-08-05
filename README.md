# Underwater Hand Slice

A complete browser-based slicing game with an underwater theme. Your webcam is processed locally in the browser: MediaPipe tracks the hand, the index fingertip becomes the blade, and person segmentation replaces the real room background with an animated underwater scene.

## Install And Run

```bash
npm install
npm run dev
```

Open the Vite localhost URL. Camera access usually requires `localhost` or HTTPS.

## Custom Image Locations

PUT GOOD IMAGES HERE:

```text
public/assets/good/
```

Examples:

```text
public/assets/good/good1.png
public/assets/good/good2.png
public/assets/good/good3.png
```

PUT BAD OR BOMB IMAGES HERE:

```text
public/assets/bad/
```

Examples:

```text
public/assets/bad/bomb1.png
public/assets/bad/bomb2.png
```

PUT THE UNDERWATER BACKGROUND HERE:

```text
public/assets/underwater/background.jpg
```

PUT FISH, STARFISH, CORAL, SEAWEED, AND OTHER SEA ASSETS HERE:

```text
public/assets/underwater/
```

PUT THE UNDERWATER MUSIC HERE:

```text
public/assets/sounds/underwater-theme.mp3
```

Sound effects go in:

```text
public/assets/sounds/
```

Expected sound paths:

```text
public/assets/sounds/slice.mp3
public/assets/sounds/bomb.mp3
public/assets/sounds/miss.mp3
public/assets/sounds/bubble.mp3
public/assets/sounds/level-up.mp3
```

## Register New Good Or Bad Images

After adding a new good or bad image, add its path here:

```text
src/assetConfig.js
```

For example:

```js
export const GOOD_IMAGES = [
  "/assets/good/good1.png",
  "/assets/good/my-new-good-object.webp",
];
```

Supported formats: PNG, JPG, JPEG, and WebP. Transparent PNG or WebP files are recommended for game objects and underwater decorations. The game preserves original image aspect ratio and does not stretch images.

## Controls

Move your index fingertip quickly through objects to slice them. In mouse mode, move the mouse quickly through objects. Clicking is not required.

Keyboard shortcuts:

- `Escape`: pause or resume
- `R`: restart after game over
- `M`: toggle music
- `S`: toggle sound effects
- `H`: switch hand or mouse mode when not actively playing

## Settings

The settings panel includes hand tracking, mouse control, music, sound effects, volume, camera display mode, player underwater effect, segmentation quality, underwater effect level, difficulty, trail visibility, instant game over, and reduced motion.

Defaults:

- Controls: Hand Tracking
- Music: On
- Sound Effects: On
- Player Underwater Effect: Subtle
- Segmentation Quality: Balanced
- Underwater Effects: Medium
- Difficulty: Normal
- Trail: On
- Instant Game Over: Off

Settings and high score are stored in `localStorage` when available.

## Camera And Privacy

The browser asks for camera permission only after Start Game is pressed. Hand tracking and segmentation run locally in the browser. No backend, database, user account, or cloud processing is used by this project.

The player is drawn into the underwater world while the real room background is removed. A hand-preservation mask expands around detected hand landmarks so fingers remain visible even when the segmentation model is imperfect.

Mouse mode is available when the camera is unavailable or when you want to test without a webcam.

## Troubleshooting

- Camera not appearing: confirm camera permission, close other apps using the camera, and run from `localhost`.
- Hand not detected: use good lighting, keep the hand inside the camera view, and show the index fingertip clearly.
- Fingers disappearing: use High Quality segmentation, keep the hand in front of your body when possible, or switch Camera to dimmed raw view.
- Images not loading: check the file is inside `public/assets/...` and that its path is listed in `src/assetConfig.js`.
- Music not playing: browsers require a user interaction first; press Start Game. Also confirm the file exists at `public/assets/sounds/underwater-theme.mp3`.
- Low frame rate: choose Performance segmentation, Low underwater effects, or Reduced Motion.
- Blank screen: check the browser console, run `npm install`, and ensure the Vite dev server is running.
- Incorrect mirrored movement: the webcam and MediaPipe coordinates are mirrored intentionally so movement feels natural.

## Project Structure

```text
underwater-hand-slice-game/
├── public/
│   ├── assets/
│   │   ├── good/
│   │   │   ├── good1.png
│   │   │   ├── good2.png
│   │   │   └── good3.png
│   │   ├── bad/
│   │   │   ├── bomb1.png
│   │   │   └── bomb2.png
│   │   ├── underwater/
│   │   │   ├── background.jpg
│   │   │   ├── foreground-rocks.png
│   │   │   ├── seaweed1.png
│   │   │   ├── seaweed2.png
│   │   │   ├── coral1.png
│   │   │   ├── coral2.png
│   │   │   ├── starfish.png
│   │   │   ├── fish1.png
│   │   │   ├── fish2.png
│   │   │   ├── fish3.png
│   │   │   └── bubble.png
│   │   ├── effects/
│   │   │   ├── bubble.png
│   │   │   ├── sparkle.png
│   │   │   └── explosion.png
│   │   └── sounds/
│   │       ├── slice.mp3
│   │       ├── bomb.mp3
│   │       ├── miss.mp3
│   │       ├── underwater-theme.mp3
│   │       ├── bubble.mp3
│   │       └── level-up.mp3
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
