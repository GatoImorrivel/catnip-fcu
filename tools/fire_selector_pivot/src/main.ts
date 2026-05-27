import m4SvgUrl from '../../../catnip_app/assets/m4_style/fire_selector.svg?url';
import akSvgUrl from '../../../catnip_app/assets/ak_style/fire_selector.svg?url';
import { getFireSelectorLayout } from '../../../catnip_app/src/replicas/fire-selector-layout';
import initialPivots from '../../../catnip_app/src/replicas/fire-selector-pivots.json';
import {
  cssTransformAroundPivot,
  fitGraphicFixedEnvelope,
  fitGraphicInSquare,
  type FireSelectorPivot,
} from './graphic-fit';

const REPLICA_TYPES = ['M4', 'AK'] as const;
type ReplicaType = (typeof REPLICA_TYPES)[number];

const ASPECT: Record<ReplicaType, number> = {
  M4: 512 / 1024,
  AK: 176.67398 / 52.871712,
};

const SVG_URL: Record<ReplicaType, string> = {
  M4: m4SvgUrl,
  AK: akSvgUrl,
};

/** Seconds to cycle through every slot position once. */
const POSITION_CYCLE_S = 10;
const EDITOR_MAX_SIZE = 300;
const ROTATE_MAX_SIZE = 260;

type PivotMap = Record<ReplicaType, FireSelectorPivot>;

type PaneElements = {
  container: HTMLDivElement;
  graphicWrap: HTMLDivElement;
  crosshair: HTMLDivElement | null;
};

type PaneLayout = {
  graphicWidth: number;
  graphicHeight: number;
  graphicOffsetX: number;
  graphicOffsetY: number;
};

type RotatePaneLayout = PaneLayout & {
  slotRotationsDeg: number[];
};

function slotRotationsForType(type: ReplicaType): number[] {
  return getFireSelectorLayout(type).slots.map((slot) => slot.rotationDeg);
}

function clonePivots(source: Record<string, FireSelectorPivot>): PivotMap {
  const result = {} as PivotMap;
  for (const type of REPLICA_TYPES) {
    const pivot = source[type];
    if (pivot && typeof pivot.x === 'number' && typeof pivot.y === 'number') {
      result[type] = { x: pivot.x, y: pivot.y };
    } else {
      result[type] = { x: 0.5, y: 0.5 };
    }
  }
  return result;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function formatPivot(pivot: FireSelectorPivot): string {
  return `x: ${pivot.x.toFixed(3)}, y: ${pivot.y.toFixed(3)}`;
}

function pivotsToJson(pivots: PivotMap): string {
  return `${JSON.stringify(pivots, null, 2)}\n`;
}

function applyPaneLayout(
  pane: PaneElements,
  rotationDeg: number,
  layout: PaneLayout,
  pivot: FireSelectorPivot,
): void {
  const containerWidth = layout.graphicOffsetX * 2 + layout.graphicWidth;
  const containerHeight = layout.graphicOffsetY * 2 + layout.graphicHeight;
  pane.container.style.width = `${containerWidth}px`;
  pane.container.style.height = `${containerHeight}px`;

  pane.graphicWrap.style.left = `${layout.graphicOffsetX}px`;
  pane.graphicWrap.style.top = `${layout.graphicOffsetY}px`;
  pane.graphicWrap.style.width = `${layout.graphicWidth}px`;
  pane.graphicWrap.style.height = `${layout.graphicHeight}px`;
  pane.graphicWrap.style.transform = cssTransformAroundPivot(
    rotationDeg,
    pivot,
    layout.graphicWidth,
    layout.graphicHeight,
  );

  if (pane.crosshair) {
    const crossX = layout.graphicOffsetX + pivot.x * layout.graphicWidth;
    const crossY = layout.graphicOffsetY + pivot.y * layout.graphicHeight;
    pane.crosshair.style.left = `${crossX}px`;
    pane.crosshair.style.top = `${crossY}px`;
  }
}

const typeSelect = document.getElementById('type-select') as HTMLSelectElement;
const coordsReadout = document.getElementById('coords-readout')!;
const editorRoot = document.getElementById('editor-root')!;
const rotateRoot = document.getElementById('rotate-root')!;
const jsonPreview = document.getElementById('json-preview')!;
const statusEl = document.getElementById('status')!;
const saveBtn = document.getElementById('save-pivots') as HTMLButtonElement;
const copyBtn = document.getElementById('copy-json') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-json') as HTMLButtonElement;
const importFile = document.getElementById('import-file') as HTMLInputElement;

let pivots = clonePivots(initialPivots as Record<string, FireSelectorPivot>);
let activeType: ReplicaType = 'M4';
let positionIndex = 0;
let positionElapsedMs = 0;
let rafId = 0;
let lastFrameMs = 0;

let editorPane: PaneElements | null = null;
let rotatePane: PaneElements | null = null;
let editorLayout: PaneLayout = {
  graphicWidth: 0,
  graphicHeight: 0,
  graphicOffsetX: 0,
  graphicOffsetY: 0,
};
let rotateLayout: RotatePaneLayout = {
  graphicWidth: 0,
  graphicHeight: 0,
  graphicOffsetX: 0,
  graphicOffsetY: 0,
  slotRotationsDeg: [],
};

function setStatus(message: string, kind: 'ok' | 'err' | '' = '') {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` ${kind}` : ''}`;
}

function updateJsonPreview(): void {
  jsonPreview.textContent = pivotsToJson(pivots);
}

function getActivePivot(): FireSelectorPivot {
  return pivots[activeType];
}

function layoutEditorPane(): void {
  if (!editorPane) {
    return;
  }

  const fitted = fitGraphicInSquare(ASPECT[activeType], 0, EDITOR_MAX_SIZE, getActivePivot());
  editorLayout = {
    graphicWidth: fitted.graphicWidth,
    graphicHeight: fitted.graphicHeight,
    graphicOffsetX: (fitted.containerWidth - fitted.graphicWidth) / 2,
    graphicOffsetY: (fitted.containerHeight - fitted.graphicHeight) / 2,
  };
  applyPaneLayout(editorPane, 0, editorLayout, getActivePivot());
}

function relayoutRotatePane(): void {
  if (!rotatePane) {
    return;
  }

  const pivot = getActivePivot();
  const slotRotationsDeg = slotRotationsForType(activeType);
  const fitted = fitGraphicFixedEnvelope(
    ASPECT[activeType],
    ROTATE_MAX_SIZE,
    pivot,
    slotRotationsDeg,
  );

  rotateLayout = {
    graphicWidth: fitted.graphicWidth,
    graphicHeight: fitted.graphicHeight,
    graphicOffsetX: fitted.graphicOffsetX,
    graphicOffsetY: fitted.graphicOffsetY,
    slotRotationsDeg,
  };

  positionIndex = 0;
  positionElapsedMs = 0;
  updateRotateTransform();
}

function currentPreviewRotationDeg(): number {
  const angles = rotateLayout.slotRotationsDeg;
  if (angles.length === 0) {
    return 0;
  }
  return angles[positionIndex % angles.length] ?? 0;
}

function updateRotateTransform(): void {
  if (!rotatePane) {
    return;
  }
  applyPaneLayout(
    rotatePane,
    currentPreviewRotationDeg(),
    rotateLayout,
    getActivePivot(),
  );
}

function setActivePivot(pivot: FireSelectorPivot): void {
  pivots[activeType] = {
    x: clamp01(pivot.x),
    y: clamp01(pivot.y),
  };
  coordsReadout.textContent = formatPivot(pivots[activeType]);
  updateJsonPreview();
  layoutEditorPane();
  relayoutRotatePane();
}

function createGraphicPane(root: HTMLElement, withCrosshair: boolean): PaneElements {
  const container = document.createElement('div');
  container.className = 'preview-container';

  const graphicWrap = document.createElement('div');
  graphicWrap.className = withCrosshair ? 'graphic-wrap' : 'graphic-wrap graphic-wrap--animated';

  const img = document.createElement('img');
  img.alt = `${activeType} fire selector`;
  img.src = SVG_URL[activeType];
  graphicWrap.appendChild(img);

  container.appendChild(graphicWrap);

  let crosshair: HTMLDivElement | null = null;
  if (withCrosshair) {
    crosshair = document.createElement('div');
    crosshair.className = 'crosshair';
    container.appendChild(crosshair);
  }

  root.appendChild(container);

  return { container, graphicWrap, crosshair };
}

function attachEditorPointerHandlers(): void {
  const onPointer = (event: PointerEvent) => {
    if (!editorPane) {
      return;
    }
    const rect = editorPane.container.getBoundingClientRect();
    const localX = event.clientX - rect.left - editorLayout.graphicOffsetX;
    const localY = event.clientY - rect.top - editorLayout.graphicOffsetY;

    if (editorLayout.graphicWidth <= 0 || editorLayout.graphicHeight <= 0) {
      return;
    }

    setActivePivot({
      x: localX / editorLayout.graphicWidth,
      y: localY / editorLayout.graphicHeight,
    });
  };

  editorRoot.addEventListener('pointerdown', (event) => {
    editorRoot.setPointerCapture(event.pointerId);
    onPointer(event);
  });

  editorRoot.addEventListener('pointermove', (event) => {
    if (!editorRoot.hasPointerCapture(event.pointerId)) {
      return;
    }
    onPointer(event);
  });

  editorRoot.addEventListener('pointerup', (event) => {
    editorRoot.releasePointerCapture(event.pointerId);
  });
}

let editorHandlersAttached = false;

function buildDom(): void {
  editorRoot.replaceChildren();
  rotateRoot.replaceChildren();

  editorPane = createGraphicPane(editorRoot, true);
  rotatePane = createGraphicPane(rotateRoot, false);

  if (!editorHandlersAttached) {
    attachEditorPointerHandlers();
    editorHandlersAttached = true;
  }

  layoutEditorPane();
  relayoutRotatePane();
}

function tickFrame(timestamp: number): void {
  if (lastFrameMs === 0) {
    lastFrameMs = timestamp;
  }

  const deltaMs = timestamp - lastFrameMs;
  lastFrameMs = timestamp;

  const angles = rotateLayout.slotRotationsDeg;
  if (angles.length > 0) {
    const holdMs = (POSITION_CYCLE_S * 1000) / angles.length;
    positionElapsedMs += deltaMs;

    while (positionElapsedMs >= holdMs) {
      positionElapsedMs -= holdMs;
      positionIndex = (positionIndex + 1) % angles.length;
      updateRotateTransform();
    }
  }

  rafId = requestAnimationFrame(tickFrame);
}

function startAnimation(): void {
  cancelAnimationFrame(rafId);
  lastFrameMs = 0;
  rafId = requestAnimationFrame(tickFrame);
}

async function savePivots(): Promise<void> {
  saveBtn.disabled = true;
  setStatus('Saving…');

  try {
    const response = await fetch('/api/save-pivots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: pivotsToJson(pivots),
    });

    const payload = (await response.json()) as { ok?: boolean; error?: string };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? `Save failed (${response.status})`);
    }

    setStatus('Saved to catnip_app/src/replicas/fire-selector-pivots.json', 'ok');
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Save failed. Use npm run dev or copy JSON manually.';
    setStatus(message, 'err');
  } finally {
    saveBtn.disabled = false;
  }
}

for (const type of REPLICA_TYPES) {
  const option = document.createElement('option');
  option.value = type;
  option.textContent = type;
  typeSelect.appendChild(option);
}

typeSelect.value = activeType;
coordsReadout.textContent = formatPivot(getActivePivot());
updateJsonPreview();
buildDom();
startAnimation();

typeSelect.addEventListener('change', () => {
  activeType = typeSelect.value as ReplicaType;
  coordsReadout.textContent = formatPivot(getActivePivot());
  buildDom();
});

saveBtn.addEventListener('click', () => {
  void savePivots();
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(pivotsToJson(pivots));
    setStatus('Copied JSON to clipboard.', 'ok');
  } catch {
    setStatus('Could not copy to clipboard.', 'err');
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([pivotsToJson(pivots)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'fire-selector-pivots.json';
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('Download started.', 'ok');
});

importFile.addEventListener('change', async () => {
  const file = importFile.files?.[0];
  importFile.value = '';
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as Record<string, FireSelectorPivot>;
    pivots = clonePivots(parsed);
    coordsReadout.textContent = formatPivot(getActivePivot());
    updateJsonPreview();
    buildDom();
    setStatus('Imported pivots from file.', 'ok');
  } catch {
    setStatus('Invalid JSON file.', 'err');
  }
});
