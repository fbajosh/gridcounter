export type InteractionMode = "increment" | "decrement";
export type ViewName = "board" | "stats";
export type ThemeName = "dark" | "light" | "astronomer" | "mogged";
export type SupportedLocale = "en-US" | "es-ES" | "pt-PT";

export interface CounterRow {
  id: string;
  title: string;
  nodes: CounterNode[];
  createdAt: number;
}

export interface CounterNode {
  id: string;
  title: string;
  count: number;
  childRow: CounterRow | null;
  createdAt: number;
}

export interface CounterPreferences {
  interactionMode: InteractionMode;
  step: number;
  editMode: boolean;
  theme: ThemeName;
  locale: SupportedLocale;
}

export type CounterEventType =
  | "count"
  | "reset-node"
  | "reset-counters"
  | "reset-all"
  | "add-child"
  | "add-sibling"
  | "remove-node"
  | "rename-node"
  | "rename-row";

export interface CounterEvent {
  id: string;
  type: CounterEventType;
  nodeId?: string;
  rowId?: string;
  nodePath?: string;
  delta?: number;
  countAfter?: number;
  titleAfter?: string;
  source: "tap" | "hold" | "system";
  timestamp: number;
}

export interface AppState {
  createdAt: number;
  lastInteractionAt: number | null;
  rootRow: CounterRow;
  preferences: CounterPreferences;
  events: CounterEvent[];
}

export interface SavedLayout {
  id: string;
  name: string;
  rootRow: CounterRow;
  savedAt: number;
}

export interface FlattenedCounter {
  id: string;
  title: string;
  path: string;
  depth: number;
  count: number;
  childCount: number;
}

export interface TimelineBucket {
  label: string;
  value: number;
}

export interface CounterActivitySummary {
  nodeId: string;
  path: string;
  title: string;
  taps: number;
  count: number;
}

export interface StatsSnapshot {
  totalCounters: number;
  totalTapEvents: number;
  totalResets: number;
  totalCount: number;
  elapsedLabel: string;
  peakMinuteLabel: string;
  averagePerMinuteLabel: string;
  leaderLabel: string;
  timeline: TimelineBucket[];
  activeCounters: CounterActivitySummary[];
}
