# Fire selector pivot editor

Standalone web tool for tuning rotation pivot points per weapon style (M4, AK). No BLE, not part of the mobile app.

## Run

```bash
cd tools/fire_selector_pivot
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Workflow

1. Pick a weapon style (M4 / AK).
2. **Set pivot** (left): click or drag on the static graphic to place the crosshair on the lever hub. The artwork does not rotate while you edit.
3. **Rotation preview** (right): steps through each layout position in order (same angles as the app) about that pivot (~10 s per full cycle).
4. Switch types and repeat for each style.
5. Click **Save** to write [`catnip_app/src/replicas/fire-selector-pivots.json`](../../catnip_app/src/replicas/fire-selector-pivots.json) automatically.

**Save** only works when the Vite dev server is running (`npm run dev`). For `vite preview` or a static build, use **Copy JSON** or **Download** and replace the file by hand.

Then rebuild the mobile app so it picks up the new pivots.

## Adding a new weapon style

1. Add SVG under `catnip_app/assets/`.
2. Extend `REPLICA_TYPES`, layouts, and `fire-selector-pivots.json`.
3. Add the type to `REPLICA_TYPES` in `src/main.ts` and `vite.config.ts`, and set aspect + SVG URL.

Pivot math is shared with the app via [`catnip_app/src/replicas/fire-selector-pivot-math.ts`](../../catnip_app/src/replicas/fire-selector-pivot-math.ts).
