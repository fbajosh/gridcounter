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

function setState(nextState: AppState): void {
  state = nextState;
  saveAppState(state);
  applyTheme(state.preferences.theme);
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
    { label: t("stats.peakMinute"), value: snapshot.peakMinuteLabel },
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
    const maxValue = Math.max(...snapshot.timeline.map((bucket) => bucket.value), 1);
    timelineWrapElement.innerHTML = `
      <div class="timeline-bars">
        ${snapshot.timeline
          .map((bucket) => {
            const height = Math.max(12, (bucket.value / maxValue) * 164);
            return `
              <div class="timeline-bar-group">
                <span class="timeline-value">${escapeHtml(formatNumber(bucket.value))}</span>
                <div class="timeline-bar" style="height:${height}px"></div>
                <span class="timeline-label">${escapeHtml(bucket.label)}</span>
              </div>
            `;
          })
          .join("")}
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
