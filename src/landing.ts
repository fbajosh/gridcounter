import type { AppState, CounterRow, InteractionMode, SavedLayout, ThemeName } from "./app-types";
import {
  aggregateCounterCount,
  appendChildCounter,
  createInitialCounterRow,
  flattenCounters,
  insertSiblingCounter,
  measureCounterNodeHeight,
  measureCounterRowHeight,
  removeCounterById,
  renameCounterNode,
  resetAllCounters,
  updateCounterCount,
} from "./counter-tree";
import { applyTranslations, setLocale, t } from "./i18n";
import { registerPwaServiceWorker, stripPwaCacheRefreshParamFromUrl } from "./pwa";
import {
  buildStatsSnapshot,
  cloneLayoutRow,
  loadAppState,
  loadDefaultLayoutId,
  loadSavedLayouts,
  recordEvent,
  saveAppState,
  saveDefaultLayoutId,
  upsertSavedLayout,
} from "./stats";
import { applyTheme } from "./theme";

type DialogName = "stats" | "instructions" | "about" | "save-layout" | "load-layout" | "theme" | "language";

const EDIT_ICON_SVG = `
  <svg
    class="counter-control-icon"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M14.236 1.76386C13.2123 0.740172 11.5525 0.740171 10.5289 1.76386L2.65722 9.63549C2.28304 10.0097 2.01623 10.4775 1.88467 10.99L1.01571 14.3755C0.971767 14.5467 1.02148 14.7284 1.14646 14.8534C1.27144 14.9783 1.45312 15.028 1.62432 14.9841L5.00978 14.1151C5.52234 13.9836 5.99015 13.7168 6.36433 13.3426L14.236 5.47097C15.2596 4.44728 15.2596 2.78755 14.236 1.76386ZM11.236 2.47097C11.8691 1.8378 12.8957 1.8378 13.5288 2.47097C14.162 3.10413 14.162 4.1307 13.5288 4.76386L12.75 5.54269L10.4571 3.24979L11.236 2.47097ZM9.75002 3.9569L12.0429 6.24979L5.65722 12.6355C5.40969 12.883 5.10023 13.0595 4.76117 13.1465L2.19447 13.8053L2.85327 11.2386C2.9403 10.8996 3.1168 10.5901 3.36433 10.3426L9.75002 3.9569Z" />
  </svg>
`;

const COUNTER_TAP_SOUND_URL = new URL("./assets/click.mp3", import.meta.url).href;
const MOGGED_COUNTER_TAP_SOUND_URL = new URL("./assets/bruh.mp3", import.meta.url).href;
const HAPTIC_ON_ICON_SVG = `
  <svg viewBox="0 0 180 177" xmlns="http://www.w3.org/2000/svg" fill="none">
    <defs>
      <linearGradient id="vibration-icon-gradient" x1="0" y1="0" x2="180" y2="177" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ff6fb7"></stop>
        <stop offset="50%" stop-color="#b98cff"></stop>
        <stop offset="100%" stop-color="#6fd6ff"></stop>
      </linearGradient>
    </defs>
    <path d="M118.574 0.000976562C135.142 0.00124045 148.574 13.4326 148.574 30.001V147.001C148.573 163.569 135.142 177.001 118.574 177.001H60.5737C44.0054 177.001 30.573 163.569 30.5728 147.001V30.001C30.5728 13.4324 44.0052 0.000976562 60.5737 0.000976562H118.574ZM60.5737 16.001C52.8417 16.001 46.5737 22.269 46.5737 30.001V147.001C46.574 154.733 52.8419 161.001 60.5737 161.001H118.574C126.305 161.001 132.573 154.733 132.574 147.001V30.001C132.574 22.2692 126.305 16.0012 118.574 16.001H60.5737ZM101.574 123.001C105.992 123.001 109.574 126.583 109.574 131.001C109.573 135.419 105.992 139.001 101.574 139.001H77.5737C73.1556 139.001 69.574 135.419 69.5737 131.001C69.5737 126.583 73.1555 123.001 77.5737 123.001H101.574Z" fill="url(#vibration-icon-gradient)"/>
    <path d="M159.573 120.5L169.118 111.552C172.573 108.313 172.473 102.798 168.904 99.6858L162.708 94.2847C159.151 91.1834 159.037 85.6926 162.463 82.4469L169.008 76.2466C172.314 73.1143 172.342 67.8575 169.069 64.6902L159.573 55.5005" stroke="url(#vibration-icon-gradient)" stroke-width="15" stroke-linecap="round"/>
    <path d="M19.5732 56.0005L10.0285 64.9486C6.57341 68.1878 6.67308 73.7029 10.243 76.8151L16.4384 82.2163C19.9958 85.3176 20.1094 90.8084 16.6833 94.0541L10.1386 100.254C6.83226 103.387 6.80432 108.643 10.0772 111.811L19.5732 121" stroke="url(#vibration-icon-gradient)" stroke-width="15" stroke-linecap="round"/>
  </svg>
`;
const HAPTIC_OFF_ICON_SVG = `
  <svg viewBox="0 0 181 181" xmlns="http://www.w3.org/2000/svg" fill="none">
    <path d="M8 8L172.686 172.686" stroke="currentColor" stroke-width="16" stroke-linecap="round"/>
    <path d="M8 8L172.686 172.686" stroke="currentColor" stroke-width="16" stroke-linecap="round"/>
    <path d="M46.6868 79.314V149C46.687 156.732 52.9549 163 60.6868 163H118.687C121.963 163 124.976 161.874 127.361 159.989L138.709 171.337C133.399 176.101 126.382 179 118.687 179H60.6868C44.1184 179 30.687 165.569 30.6868 149V63.314L46.6868 79.314ZM118.687 1.99951C135.255 1.99978 148.687 15.4321 148.687 32.0005V149C148.687 151.942 148.26 154.784 147.471 157.47L132.687 142.686V32.0005C132.687 24.2687 126.419 18.0008 118.687 18.0005H60.6868C52.9548 18.0005 46.6868 24.2685 46.6868 32.0005V56.686L30.6868 40.686V32.0005C30.6868 15.4319 44.1182 1.99951 60.6868 1.99951H118.687ZM108.372 141H77.6868C73.2687 141 69.687 137.419 69.6868 133C69.6868 128.582 73.2685 125 77.6868 125H92.3723L108.372 141Z" fill="currentColor"/>
    <path d="M46.6868 79.314V149C46.687 156.732 52.9549 163 60.6868 163H118.687C121.963 163 124.976 161.874 127.361 159.989L138.709 171.337C133.399 176.101 126.382 179 118.687 179H60.6868C44.1184 179 30.6861 165.569 30.6858 149V63.313L46.6868 79.314ZM118.687 2.00049C135.255 2.00075 148.687 15.4321 148.687 32.0005V149C148.687 151.942 148.26 154.784 147.471 157.47L132.687 142.686V32.0005C132.687 24.2687 126.419 18.0008 118.687 18.0005H60.6868C52.9548 18.0005 46.6868 24.2685 46.6868 32.0005V56.686L30.6858 40.6851V32.0005C30.6858 15.4319 44.1182 2.00049 60.6868 2.00049H118.687ZM108.372 141H77.6868C73.2687 141 69.687 137.419 69.6868 133C69.6868 128.582 73.2685 125 77.6868 125H92.3723L108.372 141Z" fill="currentColor"/>
    <path d="M159.686 122.5L169.231 113.552C172.686 110.313 172.586 104.798 169.017 101.685L162.821 96.2842C159.264 93.1829 159.15 87.6921 162.576 84.4464L169.121 78.2462C172.427 75.1138 172.455 69.857 169.182 66.6897L159.686 57.5" stroke="currentColor" stroke-width="15" stroke-linecap="round"/>
    <path d="M159.686 122.5L169.231 113.552C172.686 110.313 172.586 104.798 169.017 101.685L162.821 96.2842C159.264 93.1829 159.15 87.6921 162.576 84.4464L169.121 78.2462C172.427 75.1138 172.455 69.857 169.182 66.6897L159.686 57.5" stroke="currentColor" stroke-width="15" stroke-linecap="round"/>
    <path d="M19.6863 58L10.1416 66.9482C6.68645 70.1873 6.78611 75.7024 10.356 78.8146L16.5515 84.2158C20.1088 87.3171 20.2224 92.8079 16.7964 96.0536L10.2517 102.254C6.9453 105.386 6.91736 110.643 10.1902 113.81L19.6863 123" stroke="currentColor" stroke-width="15" stroke-linecap="round"/>
    <path d="M19.6863 58L10.1416 66.9482C6.68645 70.1873 6.78611 75.7024 10.356 78.8146L16.5515 84.2158C20.1088 87.3171 20.2224 92.8079 16.7964 96.0536L10.2517 102.254C6.9453 105.386 6.91736 110.643 10.1902 113.81L19.6863 123" stroke="currentColor" stroke-width="15" stroke-linecap="round"/>
  </svg>
`;

interface PointerGestureBase {
  pointerId: number;
  startX: number;
  startY: number;
  cancelled: boolean;
}

interface CounterGesture extends PointerGestureBase {
  nodeId: string;
}

const MOVE_CANCEL_DISTANCE = 12;

const appShellElement = requireElement<HTMLElement>(".app-shell");
const toolbarBarElement = requireElement<HTMLElement>(".toolbar-bar");
const treeScrollerElement = requireElement<HTMLElement>(".tree-scroller");
const counterTreeElement = requireElement<HTMLElement>("#counter-tree");
const moggedThemeAudioElement = requireElement<HTMLAudioElement>("#mogged-theme-audio");
const statsSummaryElement = requireElement<HTMLElement>("#stats-summary");
const timelineWrapElement = requireElement<HTMLElement>("#timeline-wrap");
const activeCounterListElement = requireElement<HTMLElement>("#active-counter-list");
const saveLayoutNameInput = requireElement<HTMLInputElement>("#save-layout-name");
const savedLayoutListElement = requireElement<HTMLElement>("#saved-layout-list");

const menuToggleButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-menu-toggle]"));
const toolbarPanels = Array.from(document.querySelectorAll<HTMLElement>(".toolbar-panel"));
const dialogShells = Array.from(document.querySelectorAll<HTMLElement>("[data-dialog]"));
const editModeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-edit-mode]"));
const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-mode]"));
const stepButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-step]"));
const themeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-theme-value]"));
const languageButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-locale]"));
const soundToggleButton = document.querySelector<HTMLButtonElement>("#sound-toggle-button");
const vibrationToggleButton = document.querySelector<HTMLButtonElement>("#vibration-toggle-button");
const soundToggleIcon = document.querySelector<HTMLElement>("[data-sound-icon]");
const vibrationToggleIcon = document.querySelector<HTMLElement>("[data-vibration-icon]");

let state = loadAppState();
let savedLayouts = loadSavedLayouts();
let defaultLayoutId = loadDefaultLayoutId();
if (defaultLayoutId && !savedLayouts.some((layout) => layout.id === defaultLayoutId)) {
  defaultLayoutId = null;
  saveDefaultLayoutId(null);
}
let openMenuId: string | null = null;
let openDialogId: DialogName | null = null;
let activeCounterGesture: CounterGesture | null = null;
let responsiveBoardSizingFrame = 0;
let treeScrollerResizeObserver: ResizeObserver | null = null;
let pendingMoggedThemeAudioPlayback = false;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(state.preferences.locale).format(value);
}

function lookupCounter(nodeId: string, row = state.rootRow) {
  return flattenCounters(row).find((counter) => counter.id === nodeId) ?? null;
}

function displayCounterTitle(rawTitle: string): string {
  return rawTitle.trim() || t("counter.fallbackTitle");
}

type MobileLayoutMode = "portrait" | "landscape" | null;

function getMobileLayoutMode(): MobileLayoutMode {
  if (window.matchMedia("(max-width: 640px) and (orientation: portrait)").matches) {
    return "portrait";
  }

  if (window.matchMedia("(max-height: 640px) and (orientation: landscape)").matches) {
    return "landscape";
  }

  return null;
}

function parsePixelValue(value: string): number {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return 0;
  }

  if (trimmedValue.endsWith("px")) {
    const parsed = Number.parseFloat(trimmedValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (trimmedValue.endsWith("rem")) {
    const parsed = Number.parseFloat(trimmedValue);
    const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(parsed) && Number.isFinite(rootFontSize) ? parsed * rootFontSize : 0;
  }

  if (trimmedValue.endsWith("em")) {
    const parsed = Number.parseFloat(trimmedValue);
    const fontSize = Number.parseFloat(window.getComputedStyle(counterTreeElement).fontSize);
    return Number.isFinite(parsed) && Number.isFinite(fontSize) ? parsed * fontSize : 0;
  }

  const parsed = Number.parseFloat(trimmedValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function measureCounterColumnCount(row: CounterRow): number {
  const flattened = flattenCounters(row);
  return flattened.reduce((maxColumns, counter) => Math.max(maxColumns, counter.depth + 1), 1);
}

function updateResponsiveBoardSizing(): void {
  responsiveBoardSizingFrame = 0;

  const mobileLayoutMode = getMobileLayoutMode();
  if (!mobileLayoutMode) {
    treeScrollerElement.style.removeProperty("height");
    counterTreeElement.style.removeProperty("--counter-grid-row-size");
    counterTreeElement.style.removeProperty("--counter-card-width");
    counterTreeElement.style.removeProperty("padding-bottom");
    return;
  }

  const shellRect = appShellElement.getBoundingClientRect();
  const scrollerRect = treeScrollerElement.getBoundingClientRect();
  const shellStyles = window.getComputedStyle(appShellElement);
  const bottomGutter = parsePixelValue(shellStyles.paddingBottom);
  const scrollerHeight = Math.max(0, shellRect.bottom - scrollerRect.top);
  const availableHeight = Math.max(0, scrollerHeight - bottomGutter);
  treeScrollerElement.style.height = `${scrollerHeight}px`;
  counterTreeElement.style.paddingBottom = `${bottomGutter}px`;
  const availableWidth = treeScrollerElement.clientWidth;
  if (availableHeight <= 0 || availableWidth <= 0) {
    return;
  }

  const computedStyles = window.getComputedStyle(counterTreeElement);
  const rowGap = parsePixelValue(computedStyles.getPropertyValue("--counter-grid-row-gap"));
  const columnGap = parsePixelValue(computedStyles.getPropertyValue("--counter-grid-column-gap"));
  const rowLimit = mobileLayoutMode === "portrait" ? 5 : 2;
  const columnLimit = mobileLayoutMode === "portrait" ? 2 : 5;
  const visibleRows = Math.min(measureCounterRowHeight(state.rootRow), rowLimit);
  const visibleColumns = Math.min(measureCounterColumnCount(state.rootRow), columnLimit);
  const rowSize = (availableHeight - rowGap * Math.max(0, visibleRows - 1)) / visibleRows;
  const cardWidth = (availableWidth - columnGap * Math.max(0, visibleColumns - 1)) / visibleColumns;

  counterTreeElement.style.setProperty("--counter-grid-row-size", `${Math.max(1, rowSize)}px`);
  counterTreeElement.style.setProperty("--counter-card-width", `${Math.max(1, cardWidth)}px`);
}

function scheduleResponsiveBoardSizing(): void {
  if (responsiveBoardSizingFrame) {
    window.cancelAnimationFrame(responsiveBoardSizingFrame);
  }

  responsiveBoardSizingFrame = window.requestAnimationFrame(() => {
    updateResponsiveBoardSizing();
  });
}

function playCounterTapSound(): void {
  if (!state.preferences.soundEnabled) {
    return;
  }

  const tapSound = new Audio(state.preferences.theme === "mogged" ? MOGGED_COUNTER_TAP_SOUND_URL : COUNTER_TAP_SOUND_URL);
  tapSound.preload = "auto";
  tapSound.volume = 1;
  tapSound.addEventListener("ended", () => {
    tapSound.src = "";
  });
  void tapSound.play().catch(() => {});
}

function vibrateCounterTap(): void {
  if (!state.preferences.vibrationEnabled) {
    return;
  }

  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate(8);
}

function pauseMoggedThemeAudio(): void {
  pendingMoggedThemeAudioPlayback = false;
  moggedThemeAudioElement.pause();
  if (moggedThemeAudioElement.currentTime > 0) {
    moggedThemeAudioElement.currentTime = 0;
  }
}

function syncMoggedThemeAudioPlayback(): void {
  if (state.preferences.theme !== "mogged" || !state.preferences.soundEnabled) {
    pauseMoggedThemeAudio();
    return;
  }

  const playbackAttempt = moggedThemeAudioElement.play();
  if (playbackAttempt && typeof playbackAttempt.catch === "function") {
    pendingMoggedThemeAudioPlayback = true;
    playbackAttempt
      .then(() => {
        pendingMoggedThemeAudioPlayback = false;
      })
      .catch(() => {
        pendingMoggedThemeAudioPlayback = true;
      });
    return;
  }

  pendingMoggedThemeAudioPlayback = false;
}

function resumeMoggedThemeAudioFromUserGesture(): void {
  if (state.preferences.theme !== "mogged" || !state.preferences.soundEnabled) {
    return;
  }

  if (!pendingMoggedThemeAudioPlayback && !moggedThemeAudioElement.paused) {
    return;
  }

  syncMoggedThemeAudioPlayback();
}

function setState(nextState: AppState): void {
  const previousTheme = state.preferences.theme;
  const previousSoundEnabled = state.preferences.soundEnabled;
  state = nextState;
  saveAppState(state);
  applyTheme(state.preferences.theme);
  if (previousTheme !== state.preferences.theme || previousSoundEnabled !== state.preferences.soundEnabled) {
    syncMoggedThemeAudioPlayback();
  }
  setLocale(state.preferences.locale);
  render();
}

function updatePreferences<K extends keyof AppState["preferences"]>(
  key: K,
  value: AppState["preferences"][K],
): void {
  setState({
    ...state,
    preferences: {
      ...state.preferences,
      [key]: value,
    },
  });
}

function closeToolbarMenus(): void {
  openMenuId = null;
  renderToolbarMenus();
}

function toggleToolbarMenu(menuId: string): void {
  openMenuId = openMenuId === menuId ? null : menuId;
  renderToolbarMenus();
}

function isDialogName(value: string | undefined): value is DialogName {
  return value === "stats" || value === "instructions" || value === "about" || value === "save-layout" || value === "load-layout" || value === "theme" || value === "language";
}

function openDialog(dialogId: DialogName): void {
  closeToolbarMenus();
  openDialogId = dialogId;
  renderDialogs();

  if (dialogId === "save-layout") {
    saveLayoutNameInput.value = "";
    window.requestAnimationFrame(() => saveLayoutNameInput.focus());
    return;
  }

  if (dialogId === "theme") {
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(`[data-dialog="theme"] [data-theme-value="${state.preferences.theme}"]`)?.focus(),
    );
    return;
  }

  if (dialogId === "language") {
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(`[data-dialog="language"] [data-locale="${state.preferences.locale}"]`)?.focus(),
    );
    return;
  }

  if (dialogId === "stats") {
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[data-dialog="stats"] .dialog-close')?.focus(),
    );
  }
}

function closeDialog(): void {
  openDialogId = null;
  renderDialogs();
}

function formatSavedLayoutTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minutes}`;
}

function saveCurrentLayout(name: string): void {
  savedLayouts = upsertSavedLayout(name, state.rootRow, savedLayouts);
  saveLayoutNameInput.value = "";
  closeDialog();
  renderSavedLayouts();
}

function loadLayoutById(layoutId: string): void {
  const layout = savedLayouts.find((entry) => entry.id === layoutId);
  if (!layout) {
    return;
  }

  clearActiveCounterGesture();
  openDialogId = null;
  setState({
    ...state,
    createdAt: Date.now(),
    lastInteractionAt: null,
    rootRow: cloneLayoutRow(layout.rootRow),
    events: [],
  });
}

function setDefaultLayout(layoutId: string): void {
  if (!savedLayouts.some((entry) => entry.id === layoutId)) {
    return;
  }

  defaultLayoutId = layoutId;
  saveDefaultLayoutId(layoutId);
  renderSavedLayouts();
}

function applyCount(nodeId: string, source: "tap" | "hold"): void {
  const delta = state.preferences.interactionMode === "increment" ? state.preferences.step : -state.preferences.step;
  const updated = updateCounterCount(state.rootRow, nodeId, delta);
  if (updated.countAfter === null) {
    return;
  }

  if (source === "tap") {
    playCounterTapSound();
    vibrateCounterTap();
  }

  const descriptor = lookupCounter(nodeId, updated.row);
  const nextState = recordEvent(
    {
      ...state,
      rootRow: updated.row,
    },
    {
      type: "count",
      nodeId,
      nodePath: descriptor?.path,
      delta,
      countAfter: updated.countAfter,
      source,
    },
  );

  setState(nextState);
}

function resetEveryCounter(): void {
  const nextState = recordEvent(
    {
      ...state,
      rootRow: resetAllCounters(state.rootRow),
    },
    {
      type: "reset-counters",
      source: "system",
    },
  );

  setState(nextState);
}

function resetBoard(): void {
  const defaultLayout = defaultLayoutId ? savedLayouts.find((layout) => layout.id === defaultLayoutId) ?? null : null;
  const nextState = recordEvent(
    {
      ...state,
      rootRow: defaultLayout ? cloneLayoutRow(defaultLayout.rootRow) : createInitialCounterRow(),
    },
    {
      type: "reset-all",
      source: "system",
    },
  );

  setState(nextState);
}

function addChildCounter(nodeId: string): void {
  const updated = appendChildCounter(state.rootRow, nodeId);
  if (!updated.newNode) {
    return;
  }

  const descriptor = lookupCounter(nodeId, updated.row);
  const nextState = recordEvent(
    {
      ...state,
      rootRow: updated.row,
    },
    {
      type: "add-child",
      nodeId,
      nodePath: descriptor?.path,
      source: "system",
    },
  );

  setState(nextState);
}

function addSiblingCounter(nodeId: string): void {
  const updated = insertSiblingCounter(state.rootRow, nodeId);
  if (!updated.newNode) {
    return;
  }

  const descriptor = lookupCounter(nodeId, updated.row);
  const nextState = recordEvent(
    {
      ...state,
      rootRow: updated.row,
    },
    {
      type: "add-sibling",
      nodeId,
      nodePath: descriptor?.path,
      source: "system",
    },
  );

  setState(nextState);
}

function removeCounter(nodeId: string): void {
  const descriptor = lookupCounter(nodeId);
  const updated = removeCounterById(state.rootRow, nodeId);
  if (!updated.removed) {
    return;
  }

  const nextState = recordEvent(
    {
      ...state,
      rootRow: updated.row,
    },
    {
      type: "remove-node",
      nodeId,
      nodePath: descriptor?.path,
      source: "system",
    },
  );

  setState(nextState);
}

function renameCounter(nodeId: string, path: string, currentTitle: string): void {
  const enteredTitle = window.prompt(t("rename.nodePrompt", { path }), currentTitle);
  if (enteredTitle === null) {
    return;
  }

  const normalizedTitle = enteredTitle.trim();
  const updated = renameCounterNode(state.rootRow, nodeId, normalizedTitle);
  if (!updated.renamed) {
    return;
  }

  const descriptor = lookupCounter(nodeId, updated.row);
  const nextState = recordEvent(
    {
      ...state,
      rootRow: updated.row,
    },
    {
      type: "rename-node",
      nodeId,
      nodePath: descriptor?.path,
      titleAfter: normalizedTitle,
      source: "system",
    },
  );

  setState(nextState);
}

function renderRow(row: CounterRow, prefix: number[] = []): string {
  const totalRows = measureCounterRowHeight(row);
  let nextRow = 1;
  const rowClassName = prefix.length === 0 ? "counter-group counter-group-root" : "counter-group";

  return `
    <section class="${rowClassName}">
      <div class="counter-list" style="grid-template-rows: repeat(${totalRows}, var(--counter-grid-row-size));">
        ${row.nodes
          .map((node, index) => {
            const rowStart = nextRow;
            const rowSpan = measureCounterNodeHeight(node);
            nextRow += rowSpan;
            return renderNode(node, [...prefix, index + 1], rowStart, rowSpan);
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderNode(node: CounterRow["nodes"][number], prefix: number[], rowStart: number, rowSpan: number): string {
  const path = prefix.join(".");
  const title = displayCounterTitle(node.title);
  const displayCount = aggregateCounterCount(node);
  const meta = node.childRow ? t("counter.nestedCount", { count: node.childRow.nodes.length }) : "";
  const isEditMode = state.preferences.editMode;

  return `
    <div class="counter-row" style="grid-row: ${rowStart} / span ${rowSpan};">
      <article class="counter-card ${isEditMode ? "is-editable" : ""}">
        <div class="counter-card-main">
          <div class="counter-card-head">
            <div class="counter-title-row">
              <p class="counter-title">${escapeHtml(title)}</p>
              ${
                isEditMode
                  ? `
                    <button
                      class="counter-control-button counter-edit"
                      type="button"
                      data-node-action="rename"
                      data-node-id="${node.id}"
                      data-node-path="${path}"
                      data-current-title="${escapeHtml(node.title)}"
                      aria-label="${escapeHtml(t("counter.renameAria", { path }))}"
                    >
                      ${EDIT_ICON_SVG}
                    </button>
                  `
                  : ""
              }
            </div>
            <div class="counter-card-controls">
              ${
                isEditMode
                  ? `
                    <button
                      class="counter-control-button counter-close"
                      type="button"
                      data-node-action="remove"
                      data-node-id="${node.id}"
                      aria-label="${escapeHtml(t("counter.removeAria", { path }))}"
                    >
                      ×
                    </button>
                  `
                  : ""
              }
            </div>
          </div>
          <button class="counter-tap" type="button" data-counter-trigger data-node-id="${node.id}">
            <span class="counter-number">${escapeHtml(formatNumber(displayCount))}</span>
            <span class="counter-meta">${escapeHtml(meta)}</span>
          </button>
          <span class="counter-path">${escapeHtml(path)}</span>
        </div>
        ${
          isEditMode
            ? `
              <button
                class="counter-sliver counter-sliver-right"
                type="button"
                data-node-action="add-child"
                data-node-id="${node.id}"
                aria-label="${escapeHtml(t("counter.addChildAria", { path }))}"
              >
                <span aria-hidden="true">+</span>
              </button>
              <button
                class="counter-sliver counter-sliver-bottom"
                type="button"
                data-node-action="add-sibling"
                data-node-id="${node.id}"
                aria-label="${escapeHtml(t("counter.addSiblingAria", { path }))}"
              >
                <span aria-hidden="true">+</span>
              </button>
              <span class="counter-sliver-corner" aria-hidden="true"></span>
            `
            : ""
        }
      </article>
      ${node.childRow ? `<div class="counter-branch">${renderRow(node.childRow, prefix)}</div>` : ""}
    </div>
  `;
}

function renderBoard(): void {
  counterTreeElement.innerHTML = renderRow(state.rootRow);
}

function renderStats(): void {
  const snapshot = buildStatsSnapshot(state);
  const cards = [
    { label: t("stats.totalCounters"), value: formatNumber(snapshot.totalCounters) },
    { label: t("stats.totalTaps"), value: formatNumber(snapshot.totalTapEvents) },
    { label: t("stats.totalResets"), value: formatNumber(snapshot.totalResets) },
    { label: t("stats.totalCount"), value: formatNumber(snapshot.totalCount) },
    { label: t("stats.elapsed"), value: snapshot.elapsedLabel },
    { label: t("stats.peakMinute"), value: snapshot.peakWindowLabel },
    { label: t("stats.averagePerMinute"), value: snapshot.averagePerMinuteLabel },
    { label: t("stats.leader"), value: snapshot.leaderLabel },
  ];

  statsSummaryElement.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-kpi">
          <span class="stat-label">${escapeHtml(card.label)}</span>
          <span class="stat-value">${escapeHtml(card.value)}</span>
        </article>
      `,
    )
    .join("");

  if (snapshot.timeline.length === 0) {
    timelineWrapElement.innerHTML = `<p class="timeline-empty">${escapeHtml(t("stats.noActivity"))}</p>`;
  } else {
    const chartWidth = 720;
    const chartHeight = 250;
    const chartPaddingTop = 16;
    const chartPaddingRight = 18;
    const chartPaddingBottom = 34;
    const chartPaddingLeft = 18;
    const plotGap = 22;
    const plotWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
    const plotHeight = (chartHeight - chartPaddingTop - chartPaddingBottom - plotGap) / 2;
    const aggregateValues = snapshot.timeline.map((bucket) => bucket.aggregateTaps);
    const instantaneousValues = snapshot.timeline.map((bucket) => bucket.instantaneousTaps);
    const aggregateMaxValue = Math.max(...aggregateValues, 1);
    const instantaneousMaxValue = Math.max(...instantaneousValues, 1);
    const bottomPlotTop = chartPaddingTop + plotHeight + plotGap;
    const tickStep = Math.max(1, Math.ceil(snapshot.timeline.length / 6));

    const buildPlotPoints = (values: number[], maxValue: number, plotTop: number): string =>
      values
        .map((value, index) => {
          const x =
            values.length === 1
              ? chartPaddingLeft + plotWidth / 2
              : chartPaddingLeft + (index / Math.max(1, values.length - 1)) * plotWidth;
          const y = plotTop + plotHeight - (value / Math.max(1, maxValue)) * plotHeight;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");

    const renderGridLines = (plotTop: number): string =>
      Array.from({ length: 4 }, (_, index) => {
        const ratio = index / 3;
        const y = plotTop + plotHeight - ratio * plotHeight;
        return `<line class="timeline-grid-line" x1="${chartPaddingLeft}" y1="${y.toFixed(2)}" x2="${(chartPaddingLeft + plotWidth).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
      }).join("");

    const renderAxisLabels = (): string =>
      snapshot.timeline
        .map((bucket, index) => {
          const isLast = index === snapshot.timeline.length - 1;
          if (!isLast && index % tickStep !== 0) {
            return "";
          }

          const x =
            snapshot.timeline.length === 1
              ? chartPaddingLeft + plotWidth / 2
              : chartPaddingLeft + (index / Math.max(1, snapshot.timeline.length - 1)) * plotWidth;
          return `
            <text class="timeline-axis-label" x="${x.toFixed(2)}" y="${(chartHeight - 8).toFixed(2)}" text-anchor="middle">
              ${escapeHtml(bucket.endElapsedLabel)}
            </text>
          `;
        })
        .join("");

    const buildAreaPath = (values: number[], maxValue: number, plotTop: number): string => {
      const points = values.map((value, index) => {
        const x =
          values.length === 1
            ? chartPaddingLeft + plotWidth / 2
            : chartPaddingLeft + (index / Math.max(1, values.length - 1)) * plotWidth;
        const y = plotTop + plotHeight - (value / Math.max(1, maxValue)) * plotHeight;
        return { x, y };
      });

      if (points.length === 0) {
        return "";
      }

      const topPath = points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(" ");
      const lastPoint = points[points.length - 1];
      const firstPoint = points[0];
      const baselineY = plotTop + plotHeight;
      return `${topPath} L ${lastPoint.x.toFixed(2)} ${baselineY.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
    };

    const aggregatePoints = buildPlotPoints(aggregateValues, aggregateMaxValue, chartPaddingTop);
    const instantaneousPoints = buildPlotPoints(instantaneousValues, instantaneousMaxValue, bottomPlotTop);
    const aggregateAreaPath = buildAreaPath(aggregateValues, aggregateMaxValue, chartPaddingTop);
    const instantaneousAreaPath = buildAreaPath(instantaneousValues, instantaneousMaxValue, bottomPlotTop);

    timelineWrapElement.innerHTML = `
      <div class="timeline-chart">
        <div class="timeline-legend">
          <span class="timeline-legend-item">
            <span class="timeline-legend-swatch timeline-legend-swatch-instantaneous" aria-hidden="true"></span>
            ${escapeHtml(t("stats.instantaneous"))}
          </span>
          <span class="timeline-legend-item">
            <span class="timeline-legend-swatch timeline-legend-swatch-aggregate" aria-hidden="true"></span>
            ${escapeHtml(t("stats.aggregate"))}
          </span>
        </div>
        <svg class="timeline-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" aria-hidden="true">
          <defs>
            <linearGradient id="timeline-aggregate-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ff8fa7" stop-opacity="0.34"></stop>
              <stop offset="58%" stop-color="#ff8fa7" stop-opacity="0.12"></stop>
              <stop offset="100%" stop-color="#ff8fa7" stop-opacity="0"></stop>
            </linearGradient>
            <linearGradient id="timeline-instantaneous-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7fd7ff" stop-opacity="0.3"></stop>
              <stop offset="58%" stop-color="#7fd7ff" stop-opacity="0.1"></stop>
              <stop offset="100%" stop-color="#7fd7ff" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          ${renderGridLines(chartPaddingTop)}
          ${renderGridLines(bottomPlotTop)}
          <text class="timeline-series-label" x="${chartPaddingLeft}" y="${(chartPaddingTop - 2).toFixed(2)}" text-anchor="start">
            ${escapeHtml(t("stats.aggregate"))}
          </text>
          <text class="timeline-series-value" x="${(chartPaddingLeft + plotWidth).toFixed(2)}" y="${(chartPaddingTop - 2).toFixed(2)}" text-anchor="end">
            ${escapeHtml(formatNumber(aggregateMaxValue))}
          </text>
          <text class="timeline-series-label" x="${chartPaddingLeft}" y="${(bottomPlotTop - 2).toFixed(2)}" text-anchor="start">
            ${escapeHtml(t("stats.instantaneous"))}
          </text>
          <text class="timeline-series-value" x="${(chartPaddingLeft + plotWidth).toFixed(2)}" y="${(bottomPlotTop - 2).toFixed(2)}" text-anchor="end">
            ${escapeHtml(formatNumber(instantaneousMaxValue))}
          </text>
          <path class="timeline-area timeline-area-aggregate" d="${aggregateAreaPath}"></path>
          <path class="timeline-area timeline-area-instantaneous" d="${instantaneousAreaPath}"></path>
          <polyline class="timeline-line timeline-line-aggregate" points="${aggregatePoints}"></polyline>
          <polyline class="timeline-line timeline-line-instantaneous" points="${instantaneousPoints}"></polyline>
          ${renderAxisLabels()}
        </svg>
        <div class="timeline-window">${escapeHtml(t("stats.windowSize", { count: snapshot.timelineBucketSeconds }))}</div>
      </div>
    `;
  }

  if (snapshot.activeCounters.length === 0) {
    activeCounterListElement.innerHTML = `<p class="active-counter-empty">${escapeHtml(t("stats.noActivity"))}</p>`;
    return;
  }

  activeCounterListElement.innerHTML = snapshot.activeCounters
    .map((summary) => {
      const title = displayCounterTitle(summary.title);
      return `
        <div class="active-counter-row">
          <div>
            <p class="active-counter-title">${escapeHtml(title)}</p>
            <p class="active-counter-meta">${escapeHtml(t("stats.counterPath", { path: summary.path }))}</p>
          </div>
          <div class="active-counter-count">
            <div>${escapeHtml(t("stats.taps", { count: summary.taps }))}</div>
            <div>${escapeHtml(t("stats.currentCount", { count: formatNumber(summary.count) }))}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderControls(): void {
  for (const button of modeButtons) {
    button.classList.toggle("is-active", button.dataset.mode === state.preferences.interactionMode);
  }

  for (const button of editModeButtons) {
    button.classList.toggle("is-active", state.preferences.editMode);
    button.textContent = t("controls.editMode");
  }

  for (const button of stepButtons) {
    button.classList.toggle("is-active", Number(button.dataset.step) === state.preferences.step);
  }

  for (const button of themeButtons) {
    button.classList.toggle("is-active", button.dataset.themeValue === state.preferences.theme);
  }

  for (const button of languageButtons) {
    button.classList.toggle("is-active", button.dataset.locale === state.preferences.locale);
  }

  if (soundToggleButton) {
    soundToggleButton.classList.toggle("is-active", state.preferences.soundEnabled);
    soundToggleButton.setAttribute("aria-pressed", String(state.preferences.soundEnabled));
    soundToggleButton.setAttribute("aria-label", t(state.preferences.soundEnabled ? "controls.soundOn" : "controls.soundOff"));
  }

  if (soundToggleIcon) {
    soundToggleIcon.className = `fa-solid ${state.preferences.soundEnabled ? "fa-volume-high" : "fa-volume-xmark"}`;
  }

  if (vibrationToggleButton) {
    vibrationToggleButton.classList.toggle("is-active", state.preferences.vibrationEnabled);
    vibrationToggleButton.setAttribute("aria-pressed", String(state.preferences.vibrationEnabled));
    vibrationToggleButton.setAttribute(
      "aria-label",
      t(state.preferences.vibrationEnabled ? "controls.vibrationOn" : "controls.vibrationOff"),
    );
  }

  if (vibrationToggleIcon) {
    vibrationToggleIcon.innerHTML = state.preferences.vibrationEnabled ? HAPTIC_ON_ICON_SVG : HAPTIC_OFF_ICON_SVG;
  }

  renderToolbarMenus();
}

function renderSavedLayouts(): void {
  if (savedLayouts.length === 0) {
    savedLayoutListElement.innerHTML = `<p class="saved-layout-empty">${escapeHtml(t("dialogs.noLayouts"))}</p>`;
    return;
  }

  savedLayoutListElement.innerHTML = savedLayouts
    .map((layout: SavedLayout) => {
      const savedAt = formatSavedLayoutTimestamp(layout.savedAt);
      const isDefault = layout.id === defaultLayoutId;
      return `
        <article class="saved-layout-item">
          <div class="saved-layout-copy">
            <p class="saved-layout-name">${escapeHtml(layout.name)}</p>
            <p class="saved-layout-meta">${escapeHtml(savedAt)}</p>
          </div>
          <div class="saved-layout-actions">
            <button class="toolbar-option saved-layout-load" type="button" data-layout-load-id="${layout.id}">
              ${escapeHtml(t("dialogs.loadAction"))}
            </button>
            <button
              class="toolbar-option saved-layout-default ${isDefault ? "is-active" : ""}"
              type="button"
              data-layout-default-id="${layout.id}"
              aria-pressed="${String(isDefault)}"
            >
              ${escapeHtml(t("dialogs.defaultAction"))}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderToolbarMenus(): void {
  for (const button of menuToggleButtons) {
    const menuId = button.dataset.menuToggle ?? "";
    const isOpen = openMenuId === menuId;
    button.classList.toggle("is-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    button.closest(".toolbar-item")?.classList.toggle("is-open", isOpen);
  }

  for (const panel of toolbarPanels) {
    const isOpen = openMenuId === panel.id;
    panel.classList.toggle("hidden", !isOpen);
    panel.classList.toggle("is-open", isOpen);
  }
}

function renderDialogs(): void {
  for (const dialog of dialogShells) {
    const dialogId = dialog.dataset.dialog as DialogName | undefined;
    const isOpen = openDialogId === dialogId;
    dialog.classList.toggle("hidden", !isOpen);
    dialog.classList.toggle("is-open", isOpen);
    dialog.setAttribute("aria-hidden", String(!isOpen));
  }

  document.body.classList.toggle("has-open-dialog", openDialogId !== null);
}

function render(): void {
  applyTranslations(document);
  renderControls();
  renderSavedLayouts();
  renderDialogs();
  renderBoard();
  renderStats();
  document.title = t("app.boardTitle");
  scheduleResponsiveBoardSizing();
}

function startCounterGesture(nodeId: string, event: PointerEvent): void {
  clearActiveCounterGesture();

  const gesture: CounterGesture = {
    nodeId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    cancelled: false,
  };

  activeCounterGesture = gesture;
}

function clearActiveCounterGesture(): void {
  activeCounterGesture = null;
}

function cancelGesture(gesture: PointerGestureBase | null): void {
  if (!gesture) {
    return;
  }

  gesture.cancelled = true;
}

function pointerMovedTooFar(gesture: PointerGestureBase, event: PointerEvent): boolean {
  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  return Math.hypot(deltaX, deltaY) > MOVE_CANCEL_DISTANCE;
}

function handlePointerDown(event: PointerEvent): void {
  resumeMoggedThemeAudioFromUserGesture();

  const target = event.target instanceof Element ? event.target : null;
  if (!target || (event.pointerType === "mouse" && event.button !== 0)) {
    return;
  }

  const counterButton = target.closest<HTMLElement>("[data-counter-trigger]");
  if (counterButton?.dataset.nodeId) {
    event.preventDefault();
    startCounterGesture(counterButton.dataset.nodeId, event);
  }
}

function handlePointerMove(event: PointerEvent): void {
  if (activeCounterGesture && activeCounterGesture.pointerId === event.pointerId && pointerMovedTooFar(activeCounterGesture, event)) {
    cancelGesture(activeCounterGesture);
  }
}

function handlePointerEnd(event: PointerEvent): void {
  if (activeCounterGesture && activeCounterGesture.pointerId === event.pointerId) {
    const gesture = activeCounterGesture;
    activeCounterGesture = null;

    if (event.type !== "pointercancel" && !gesture.cancelled) {
      applyCount(gesture.nodeId, "tap");
    }
  }
}

function handleControlClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const menuToggleButton = target.closest<HTMLButtonElement>("[data-menu-toggle]");
  if (menuToggleButton?.dataset.menuToggle) {
    event.preventDefault();
    toggleToolbarMenu(menuToggleButton.dataset.menuToggle);
    return;
  }

  if (!toolbarBarElement.contains(target)) {
    closeToolbarMenus();
  }

  const dialogCloseButton = target.closest<HTMLElement>("[data-dialog-close]");
  if (dialogCloseButton) {
    event.preventDefault();
    closeDialog();
    return;
  }

  const dialogShell = target.closest<HTMLElement>("[data-dialog]");
  if (dialogShell && target === dialogShell) {
    event.preventDefault();
    closeDialog();
    return;
  }

  const dialogOpenButton = target.closest<HTMLButtonElement>("[data-dialog-open]");
  if (dialogOpenButton && isDialogName(dialogOpenButton.dataset.dialogOpen)) {
    event.preventDefault();
    openDialog(dialogOpenButton.dataset.dialogOpen);
    return;
  }

  const modeButton = target.closest<HTMLButtonElement>("[data-mode]");
  if (modeButton?.dataset.mode === "increment" || modeButton?.dataset.mode === "decrement") {
    closeToolbarMenus();
    updatePreferences("interactionMode", modeButton.dataset.mode as InteractionMode);
    return;
  }

  const stepButton = target.closest<HTMLButtonElement>("[data-step]");
  if (stepButton?.dataset.step) {
    closeToolbarMenus();
    updatePreferences("step", Number(stepButton.dataset.step) as 1 | 5 | 10);
    return;
  }

  const themeButton = target.closest<HTMLButtonElement>("[data-theme-value]");
  if (
    themeButton?.dataset.themeValue === "dark" ||
    themeButton?.dataset.themeValue === "light" ||
    themeButton?.dataset.themeValue === "astronomer" ||
    themeButton?.dataset.themeValue === "mogged"
  ) {
    updatePreferences("theme", themeButton.dataset.themeValue as ThemeName);
    if (openDialogId === "theme") {
      closeDialog();
    } else {
      closeToolbarMenus();
    }
    return;
  }

  const languageButton = target.closest<HTMLButtonElement>("[data-locale]");
  if (
    languageButton?.dataset.locale === "en-US" ||
    languageButton?.dataset.locale === "es-ES" ||
    languageButton?.dataset.locale === "pt-PT"
  ) {
    updatePreferences("locale", languageButton.dataset.locale as AppState["preferences"]["locale"]);
    if (openDialogId === "language") {
      closeDialog();
    } else {
      closeToolbarMenus();
    }
    return;
  }

  if (target.closest("#sound-toggle-button")) {
    closeToolbarMenus();
    updatePreferences("soundEnabled", !state.preferences.soundEnabled);
    return;
  }

  if (target.closest("#vibration-toggle-button")) {
    closeToolbarMenus();
    updatePreferences("vibrationEnabled", !state.preferences.vibrationEnabled);
    return;
  }

  if (target.closest("[data-edit-mode]")) {
    closeToolbarMenus();
    updatePreferences("editMode", !state.preferences.editMode);
    return;
  }

  const layoutLoadButton = target.closest<HTMLButtonElement>("[data-layout-load-id]");
  if (layoutLoadButton?.dataset.layoutLoadId) {
    event.preventDefault();
    loadLayoutById(layoutLoadButton.dataset.layoutLoadId);
    return;
  }

  const layoutDefaultButton = target.closest<HTMLButtonElement>("[data-layout-default-id]");
  if (layoutDefaultButton?.dataset.layoutDefaultId) {
    event.preventDefault();
    setDefaultLayout(layoutDefaultButton.dataset.layoutDefaultId);
    return;
  }

  if (target.closest("#reset-all-button")) {
    closeToolbarMenus();
    resetBoard();
    return;
  }

  if (target.closest("#reset-counters-button")) {
    closeToolbarMenus();
    resetEveryCounter();
    return;
  }

  const nodeActionButton = target.closest<HTMLButtonElement>("[data-node-action]");
  if (!nodeActionButton?.dataset.nodeId) {
    return;
  }

  if (nodeActionButton.dataset.nodeAction === "add-child") {
    addChildCounter(nodeActionButton.dataset.nodeId);
    return;
  }

  if (nodeActionButton.dataset.nodeAction === "add-sibling") {
    addSiblingCounter(nodeActionButton.dataset.nodeId);
    return;
  }

  if (nodeActionButton.dataset.nodeAction === "remove") {
    removeCounter(nodeActionButton.dataset.nodeId);
    return;
  }

  if (nodeActionButton.dataset.nodeAction === "rename") {
    renameCounter(
      nodeActionButton.dataset.nodeId,
      nodeActionButton.dataset.nodePath ?? lookupCounter(nodeActionButton.dataset.nodeId)?.path ?? "",
      nodeActionButton.dataset.currentTitle ?? lookupCounter(nodeActionButton.dataset.nodeId)?.title ?? "",
    );
  }
}

function handleFormSubmit(event: SubmitEvent): void {
  const target = event.target instanceof HTMLFormElement ? event.target : null;
  if (!target || target.id !== "save-layout-form") {
    return;
  }

  event.preventDefault();
  const layoutName = saveLayoutNameInput.value.trim();
  if (!layoutName) {
    saveLayoutNameInput.focus();
    return;
  }

  saveCurrentLayout(layoutName);
}

function handleGlobalKeyDown(event: KeyboardEvent): void {
  resumeMoggedThemeAudioFromUserGesture();

  if (event.key === "Escape") {
    if (openDialogId) {
      closeDialog();
      return;
    }

    closeToolbarMenus();
  }
}

function initialize(): void {
  stripPwaCacheRefreshParamFromUrl();
  applyTheme(state.preferences.theme);
  syncMoggedThemeAudioPlayback();
  setLocale(state.preferences.locale);
  applyTranslations(document);
  render();
  registerPwaServiceWorker();

  document.addEventListener("click", handleControlClick);
  document.addEventListener("keydown", handleGlobalKeyDown);
  document.addEventListener("submit", handleFormSubmit);
  document.addEventListener("pointerup", handlePointerEnd);
  document.addEventListener("pointercancel", handlePointerEnd);
  document.addEventListener("pointermove", handlePointerMove);
  counterTreeElement.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("resize", scheduleResponsiveBoardSizing);

  if (typeof ResizeObserver !== "undefined") {
    treeScrollerResizeObserver = new ResizeObserver(() => {
      scheduleResponsiveBoardSizing();
    });
    treeScrollerResizeObserver.observe(treeScrollerElement);
  }
}

initialize();
