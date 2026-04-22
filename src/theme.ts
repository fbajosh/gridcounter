import type { ThemeName } from "./app-types";

type ThemeTokens = Record<string, string>;

const THEMES: Record<ThemeName, ThemeTokens> = {
  dark: {
    "--app-bg-top": "#131625",
    "--app-bg": "#0e1017",
    "--body-overlay":
      "linear-gradient(120deg, rgba(255, 255, 255, 0.03), transparent 24%), linear-gradient(300deg, rgba(255, 255, 255, 0.02), transparent 18%), radial-gradient(circle at center, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0) 62%)",
    "--panel-bg": "rgba(17, 19, 28, 0.88)",
    "--panel-border": "rgba(255, 255, 255, 0.1)",
    "--card-bg": "linear-gradient(180deg, rgba(30, 34, 48, 0.98), rgba(18, 20, 30, 0.98))",
    "--card-border": "rgba(255, 255, 255, 0.08)",
    "--accent-color": "#7fd7ff",
    "--accent-gradient": "linear-gradient(90deg, #f86891 0%, #8f6bff 100%)",
    "--accent-gradient-soft": "linear-gradient(90deg, rgba(248, 104, 145, 0.2) 0%, rgba(143, 107, 255, 0.2) 100%)",
    "--bokeh-pink": "rgba(248, 104, 145, 0.52)",
    "--bokeh-pink-soft": "rgba(248, 104, 145, 0.22)",
    "--bokeh-violet": "rgba(143, 107, 255, 0.48)",
    "--bokeh-violet-soft": "rgba(143, 107, 255, 0.2)",
    "--bokeh-magenta": "rgba(195, 90, 200, 0.4)",
    "--bokeh-magenta-soft": "rgba(195, 90, 200, 0.16)",
    "--text-primary": "#f8f9fc",
    "--text-secondary": "#c6cedf",
    "--text-muted": "rgba(198, 206, 223, 0.62)",
    "--surface-shadow": "rgba(0, 0, 0, 0.38)",
    "--tree-line": "rgba(255, 255, 255, 0.12)",
    "--danger": "#ff7d87",
    "--danger-soft": "rgba(255, 125, 135, 0.18)",
    "--body-font": "\"Ubuntu Sans\", sans-serif",
  },
  light: {
    "--app-bg-top": "#f4f5fb",
    "--app-bg": "#ebedf5",
    "--body-overlay":
      "linear-gradient(120deg, rgba(255, 255, 255, 0.18), transparent 28%), linear-gradient(300deg, rgba(255, 255, 255, 0.14), transparent 18%), radial-gradient(circle at center, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 62%)",
    "--panel-bg": "rgba(255, 255, 255, 0.82)",
    "--panel-border": "rgba(36, 43, 64, 0.12)",
    "--card-bg": "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 243, 251, 0.96))",
    "--card-border": "rgba(36, 43, 64, 0.12)",
    "--accent-color": "#385ef6",
    "--accent-gradient": "linear-gradient(90deg, #f86891 0%, #5166ff 100%)",
    "--accent-gradient-soft": "linear-gradient(90deg, rgba(248, 104, 145, 0.18) 0%, rgba(81, 102, 255, 0.18) 100%)",
    "--bokeh-pink": "rgba(248, 104, 145, 0.42)",
    "--bokeh-pink-soft": "rgba(248, 104, 145, 0.18)",
    "--bokeh-violet": "rgba(81, 102, 255, 0.34)",
    "--bokeh-violet-soft": "rgba(81, 102, 255, 0.14)",
    "--bokeh-magenta": "rgba(195, 90, 200, 0.28)",
    "--bokeh-magenta-soft": "rgba(195, 90, 200, 0.12)",
    "--text-primary": "#162033",
    "--text-secondary": "#314057",
    "--text-muted": "rgba(49, 64, 87, 0.68)",
    "--surface-shadow": "rgba(61, 74, 112, 0.16)",
    "--tree-line": "rgba(22, 32, 51, 0.12)",
    "--danger": "#d33d4d",
    "--danger-soft": "rgba(211, 61, 77, 0.12)",
    "--body-font": "\"Ubuntu Sans\", sans-serif",
  },
  astronomer: {
    "--app-bg-top": "#050000",
    "--app-bg": "#000000",
    "--body-overlay":
      "linear-gradient(120deg, rgba(84, 12, 12, 0.18), transparent 28%), linear-gradient(300deg, rgba(46, 0, 0, 0.2), transparent 18%), radial-gradient(circle at center, rgba(82, 8, 8, 0.16), rgba(0, 0, 0, 0) 62%)",
    "--panel-bg": "rgba(7, 0, 0, 0.94)",
    "--panel-border": "rgba(134, 34, 34, 0.2)",
    "--card-bg": "linear-gradient(180deg, rgba(12, 0, 0, 0.99), rgba(3, 0, 0, 0.99))",
    "--card-border": "rgba(122, 34, 34, 0.18)",
    "--accent-color": "#b33939",
    "--accent-gradient": "linear-gradient(90deg, #8c1414 0%, #2c0000 100%)",
    "--accent-gradient-soft": "linear-gradient(90deg, rgba(140, 20, 20, 0.24) 0%, rgba(44, 0, 0, 0.2) 100%)",
    "--bokeh-pink": "rgba(122, 16, 16, 0.3)",
    "--bokeh-pink-soft": "rgba(122, 16, 16, 0.12)",
    "--bokeh-violet": "rgba(70, 0, 0, 0.22)",
    "--bokeh-violet-soft": "rgba(70, 0, 0, 0.1)",
    "--bokeh-magenta": "rgba(96, 10, 10, 0.24)",
    "--bokeh-magenta-soft": "rgba(96, 10, 10, 0.1)",
    "--text-primary": "#f5eded",
    "--text-secondary": "#ccb7b7",
    "--text-muted": "rgba(204, 183, 183, 0.58)",
    "--surface-shadow": "rgba(0, 0, 0, 0.62)",
    "--tree-line": "rgba(155, 47, 47, 0.16)",
    "--danger": "#db5656",
    "--danger-soft": "rgba(219, 86, 86, 0.16)",
    "--body-font": "\"Ubuntu Sans\", sans-serif",
  },
  mogged: {
    "--app-bg-top": "#0f070a",
    "--app-bg": "#090909",
    "--body-overlay":
      "linear-gradient(120deg, rgba(255, 255, 255, 0.02), transparent 24%), linear-gradient(300deg, rgba(255, 255, 255, 0.018), transparent 18%), radial-gradient(circle at center, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0) 62%)",
    "--panel-bg": "rgba(12, 12, 12, 0.9)",
    "--panel-border": "rgba(255, 255, 255, 0.12)",
    "--card-bg": "linear-gradient(135deg, rgba(18, 18, 18, 0.98), rgba(10, 10, 10, 0.98))",
    "--card-border": "rgba(255, 255, 255, 0.08)",
    "--accent-color": "#ec407a",
    "--accent-gradient": "linear-gradient(90deg, #ec407a 0%, #ab47bc 100%)",
    "--accent-gradient-soft": "linear-gradient(90deg, rgba(236, 64, 122, 0.2) 0%, rgba(171, 71, 188, 0.2) 100%)",
    "--bokeh-pink": "rgba(248, 104, 145, 0.52)",
    "--bokeh-pink-soft": "rgba(248, 104, 145, 0.22)",
    "--bokeh-violet": "rgba(143, 107, 255, 0.48)",
    "--bokeh-violet-soft": "rgba(143, 107, 255, 0.2)",
    "--bokeh-magenta": "rgba(195, 90, 200, 0.4)",
    "--bokeh-magenta-soft": "rgba(195, 90, 200, 0.16)",
    "--text-primary": "#ffffff",
    "--text-secondary": "#ebebeb",
    "--text-muted": "rgba(255, 255, 255, 0.58)",
    "--surface-shadow": "rgba(0, 0, 0, 0.44)",
    "--tree-line": "rgba(255, 255, 255, 0.1)",
    "--danger": "#ff6d8a",
    "--danger-soft": "rgba(255, 109, 138, 0.18)",
    "--body-font": "\"Ubuntu Sans\", sans-serif",
  },
};

export const THEME_ORDER: ThemeName[] = ["dark", "light", "astronomer", "mogged"];

export function applyTheme(theme: ThemeName): void {
  const root = document.documentElement;
  root.dataset.theme = theme;

  for (const [token, value] of Object.entries(THEMES[theme])) {
    root.style.setProperty(token, value);
  }
}
