import type {
  AppState,
  CounterEvent,
  CounterPreferences,
  CounterNode,
  CounterRow,
  SavedLayout,
  StatsSnapshot,
  SupportedLocale,
  ThemeName,
} from "./app-types";
import { countCounters, createInitialCounterRow, flattenCounters, sumCounts } from "./counter-tree";

const STORAGE_KEY = "counter-grid-state-v1";
const LAYOUT_STORAGE_KEY = "counter-grid-layouts-v1";
const DEFAULT_LAYOUT_STORAGE_KEY = "counter-grid-default-layout-v1";
const MAX_EVENTS = 2000;

function coerceTheme(value: unknown): ThemeName {
  return value === "light" || value === "astronomer" || value === "mogged" ? value : "dark";
}

function coerceLocale(value: unknown): SupportedLocale {
  return value === "es-ES" || value === "pt-PT" ? value : "en-US";
}

function sanitizeCounterRow(value: unknown): CounterRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CounterRow>;
  if (typeof candidate.id !== "string" || !Array.isArray(candidate.nodes)) {
    return null;
  }

  const nodes = candidate.nodes.map(sanitizeCounterNode).filter(Boolean) as CounterNode[];
  if (!nodes.length) {
    return null;
  }

  return {
    id: candidate.id,
    title: typeof candidate.title === "string" ? candidate.title : "",
    nodes,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
  };
}

function sanitizeCounterNode(value: unknown): CounterNode | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CounterNode>;
  if (typeof candidate.id !== "string" || typeof candidate.count !== "number") {
    return null;
  }

  return {
    id: candidate.id,
    title: typeof candidate.title === "string" ? candidate.title : "",
    count: candidate.count,
    childRow: sanitizeCounterRow(candidate.childRow),
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
  };
}

function sanitizePreferences(value: unknown): CounterPreferences {
  const candidate = value && typeof value === "object" ? (value as Partial<CounterPreferences>) : {};
  return {
    interactionMode: candidate.interactionMode === "decrement" ? "decrement" : "increment",
    step: candidate.step === 5 || candidate.step === 10 ? candidate.step : 1,
    editMode: Boolean(candidate.editMode),
    soundEnabled: candidate.soundEnabled !== false,
    vibrationEnabled: candidate.vibrationEnabled !== false,
    theme: coerceTheme(candidate.theme),
    locale: coerceLocale(candidate.locale),
  };
}

function sanitizeEvents(value: unknown): CounterEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Partial<CounterEvent>)
    .filter((item) => typeof item.id === "string" && typeof item.type === "string" && typeof item.timestamp === "number")
    .slice(-MAX_EVENTS)
    .map((item) => ({
      id: item.id as string,
      type: item.type as CounterEvent["type"],
      nodeId: typeof item.nodeId === "string" ? item.nodeId : undefined,
      rowId: typeof item.rowId === "string" ? item.rowId : undefined,
      nodePath: typeof item.nodePath === "string" ? item.nodePath : undefined,
      delta: typeof item.delta === "number" ? item.delta : undefined,
      countAfter: typeof item.countAfter === "number" ? item.countAfter : undefined,
      titleAfter: typeof item.titleAfter === "string" ? item.titleAfter : undefined,
      source: item.source === "hold" || item.source === "system" ? item.source : "tap",
      timestamp: item.timestamp as number,
    }));
}

function formatDuration(milliseconds: number, locale: SupportedLocale): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(new Intl.NumberFormat(locale).format(hours));
    parts.push("h");
  }
  if (minutes > 0 || hours > 0) {
    parts.push(new Intl.NumberFormat(locale).format(minutes));
    parts.push("m");
  }
  parts.push(new Intl.NumberFormat(locale).format(seconds));
  parts.push("s");
  return parts.join(" ");
}

function formatRate(events: number, minutes: number, locale: SupportedLocale): string {
  if (!minutes || !Number.isFinite(minutes)) {
    return "0.0";
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(events / minutes);
}

function formatElapsedBucketLabel(totalSeconds: number, locale: SupportedLocale): string {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;
  const formatter = new Intl.NumberFormat(locale);

  if (hours > 0) {
    return `${formatter.format(hours)}h ${formatter.format(minutes)}m`;
  }

  if (minutes > 0) {
    return `${formatter.format(minutes)}m ${formatter.format(seconds)}s`;
  }

  return `${formatter.format(seconds)}s`;
}

function createEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStorageId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeLayoutName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function sanitizeSavedLayouts(value: unknown): SavedLayout[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Partial<SavedLayout>)
    .map((item) => {
      const rootRow = sanitizeCounterRow(item.rootRow);
      if (!rootRow || typeof item.id !== "string" || typeof item.name !== "string") {
        return null;
      }

      return {
        id: item.id,
        name: item.name.trim(),
        rootRow,
        savedAt: typeof item.savedAt === "number" ? item.savedAt : Date.now(),
      };
    })
    .filter((item): item is SavedLayout => Boolean(item && item.name))
    .sort((left, right) => right.savedAt - left.savedAt);
}

function persistSavedLayouts(layouts: SavedLayout[]): void {
  window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
}

export function cloneLayoutNode(node: CounterNode): CounterNode {
  return {
    ...node,
    count: 0,
    childRow: node.childRow ? cloneLayoutRow(node.childRow) : null,
  };
}

export function cloneLayoutRow(row: CounterRow): CounterRow {
  return {
    ...row,
    nodes: row.nodes.map(cloneLayoutNode),
  };
}

export function createDefaultState(): AppState {
  return {
    createdAt: Date.now(),
    lastInteractionAt: null,
    rootRow: createInitialCounterRow(),
    preferences: {
      interactionMode: "increment",
      step: 1,
      editMode: false,
      soundEnabled: true,
      vibrationEnabled: true,
      theme: "dark",
      locale: "en-US",
    },
    events: [],
  };
}

export function loadAppState(): AppState {
  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return createDefaultState();
    }

    const parsed = JSON.parse(rawState) as Partial<AppState>;
    const rootRow = sanitizeCounterRow(parsed.rootRow);

    return {
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      lastInteractionAt: typeof parsed.lastInteractionAt === "number" ? parsed.lastInteractionAt : null,
      rootRow: rootRow ?? createInitialCounterRow(),
      preferences: sanitizePreferences(parsed.preferences),
      events: sanitizeEvents(parsed.events),
    };
  } catch {
    return createDefaultState();
  }
}

export function saveAppState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadSavedLayouts(): SavedLayout[] {
  try {
    const rawLayouts = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!rawLayouts) {
      return [];
    }

    return sanitizeSavedLayouts(JSON.parse(rawLayouts));
  } catch {
    return [];
  }
}

export function loadDefaultLayoutId(): string | null {
  try {
    const rawValue = window.localStorage.getItem(DEFAULT_LAYOUT_STORAGE_KEY);
    return rawValue && rawValue.trim() ? rawValue : null;
  } catch {
    return null;
  }
}

export function saveDefaultLayoutId(layoutId: string | null): void {
  if (!layoutId) {
    window.localStorage.removeItem(DEFAULT_LAYOUT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(DEFAULT_LAYOUT_STORAGE_KEY, layoutId);
}

export function upsertSavedLayout(name: string, row: CounterRow, currentLayouts: SavedLayout[]): SavedLayout[] {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return currentLayouts;
  }

  const timestamp = Date.now();
  const layoutRow = cloneLayoutRow(row);
  const existingLayout = currentLayouts.find((layout) => normalizeLayoutName(layout.name) === normalizeLayoutName(normalizedName));
  const nextLayouts = existingLayout
    ? currentLayouts.map((layout) =>
        layout.id === existingLayout.id
          ? {
              ...layout,
              name: normalizedName,
              rootRow: layoutRow,
              savedAt: timestamp,
            }
          : layout,
      )
    : [
        {
          id: createStorageId("layout"),
          name: normalizedName,
          rootRow: layoutRow,
          savedAt: timestamp,
        },
        ...currentLayouts,
      ];

  const sortedLayouts = [...nextLayouts].sort((left, right) => right.savedAt - left.savedAt);
  persistSavedLayouts(sortedLayouts);
  return sortedLayouts;
}

export function recordEvent(
  state: AppState,
  event: Omit<CounterEvent, "id" | "timestamp"> & { timestamp?: number },
): AppState {
  const timestamp = event.timestamp ?? Date.now();
  const nextEvent: CounterEvent = {
    ...event,
    id: createEventId(),
    timestamp,
  };

  return {
    ...state,
    lastInteractionAt: timestamp,
    events: [...state.events, nextEvent].slice(-MAX_EVENTS),
  };
}

export function buildStatsSnapshot(state: AppState, now = Date.now()): StatsSnapshot {
  const locale = state.preferences.locale;
  const flattened = flattenCounters(state.rootRow);
  const totalCount = sumCounts(state.rootRow);
  const countEvents = state.events.filter((event) => event.type === "count").sort((left, right) => left.timestamp - right.timestamp);
  const totalTapEvents = countEvents.length;
  const totalResets = state.events.filter(
    (event) => event.type === "reset-node" || event.type === "reset-counters" || event.type === "reset-all",
  ).length;
  const firstTimestamp = state.events[0]?.timestamp ?? state.createdAt;
  const elapsedMilliseconds = Math.max(0, (state.lastInteractionAt ?? now) - firstTimestamp);
  let timelineBucketSeconds = 1;
  let timeline: StatsSnapshot["timeline"] = [];

  if (countEvents.length > 0) {
    const firstTapTimestamp = countEvents[0].timestamp;
    const lastTapTimestamp = countEvents[countEvents.length - 1].timestamp;
    const recordedTapSpanMilliseconds = Math.max(1, lastTapTimestamp - firstTapTimestamp);
    const recordedTapSpanSeconds = Math.max(1, Math.ceil(recordedTapSpanMilliseconds / 1000));
    timelineBucketSeconds = Math.max(1, Math.ceil(recordedTapSpanSeconds / 60));
    const bucketDurationMilliseconds = timelineBucketSeconds * 1000;
    const bucketCount = Math.max(1, Math.ceil(recordedTapSpanSeconds / timelineBucketSeconds));
    const instantaneousBuckets = Array.from({ length: bucketCount }, () => 0);

    for (const event of countEvents) {
      const elapsedMillisecondsFromFirstTap = event.timestamp - firstTapTimestamp;
      const bucketIndex = Math.min(bucketCount - 1, Math.floor(elapsedMillisecondsFromFirstTap / bucketDurationMilliseconds));
      instantaneousBuckets[bucketIndex] += 1;
    }

    let aggregateTaps = 0;
    timeline = instantaneousBuckets.map((instantaneousTaps, index) => {
      aggregateTaps += instantaneousTaps;
      const bucketStartSeconds = index * timelineBucketSeconds;
      const bucketEndSeconds = Math.min(recordedTapSpanSeconds, (index + 1) * timelineBucketSeconds);

      return {
        startElapsedLabel: formatElapsedBucketLabel(bucketStartSeconds, locale),
        endElapsedLabel: formatElapsedBucketLabel(bucketEndSeconds, locale),
        instantaneousTaps,
        aggregateTaps,
      };
    });
  }

  let peakWindowLabel = "0";
  if (timeline.length > 0) {
    const peakBucket = timeline.reduce((best, current) =>
      current.instantaneousTaps > best.instantaneousTaps ? current : best,
    );
    peakWindowLabel = `${peakBucket.instantaneousTaps} @ ${peakBucket.startElapsedLabel}-${peakBucket.endElapsedLabel}`;
  }

  const activityMap = new Map<string, { path: string; taps: number }>();
  for (const event of countEvents) {
    if (!event.nodeId) {
      continue;
    }

    const current = activityMap.get(event.nodeId) ?? {
      path: event.nodePath ?? event.nodeId,
      taps: 0,
    };
    current.taps += 1;
    current.path = event.nodePath ?? current.path;
    activityMap.set(event.nodeId, current);
  }

  const counterById = new Map(flattened.map((counter) => [counter.id, counter]));
  const activeCounters = [...activityMap.entries()]
    .map(([nodeId, summary]) => ({
      nodeId,
      path: counterById.get(nodeId)?.path ?? summary.path,
      title: counterById.get(nodeId)?.title ?? "",
      taps: summary.taps,
      count: counterById.get(nodeId)?.count ?? 0,
    }))
    .sort((left, right) => right.taps - left.taps || right.count - left.count)
    .slice(0, 6);

  const leader = flattened.reduce(
    (best, counter) => (counter.count > best.count ? counter : best),
    flattened[0] ?? { id: "none", title: "", path: "0", depth: 0, count: 0, childCount: 0 },
  );

  return {
    totalCounters: countCounters(state.rootRow),
    totalTapEvents,
    totalResets,
    totalCount,
    elapsedLabel: formatDuration(elapsedMilliseconds, locale),
    peakWindowLabel,
    averagePerMinuteLabel: formatRate(totalTapEvents, elapsedMilliseconds / 60000, locale),
    leaderLabel: `${leader.path} (${new Intl.NumberFormat(locale).format(leader.count)})`,
    timelineBucketSeconds,
    timeline,
    activeCounters,
  };
}
