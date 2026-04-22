import type { SupportedLocale } from "./app-types";

type TranslationBranch = Record<string, string | TranslationBranch>;

export const APP_TRANSLATIONS = {
  "en-US": {
    app: {
      eyebrow: "Appmogged",
      titleLead: "Grid",
      titleTail: "Counter",
      description: "Touch-first nested tally counters for quick tracking.",
      boardTitle: "Grid Counter",
      statsTitle: "Grid Counter Stats",
    },
    views: {
      board: "Counters",
      stats: "Stats",
    },
    dialogs: {
      instructionsMenu: "Instructions",
      aboutMenu: "About",
      close: "Close",
      saveLayoutTitle: "Save Layout",
      loadLayoutTitle: "Load Layout",
      layoutName: "Layout Name",
      saveAction: "Save Layout",
      loadAction: "Load",
      saveLayoutHint: "Saves the structure and titles only. Counts start from zero when loaded.",
      noLayouts: "No saved layouts yet.",
      savedAt: "Saved {date}",
      instructionsTitle: "Instructions",
      instructionsIntro: "Tap any counter tile to change its number.",
      instructionsExpand: "Turn on Edit Mode to reveal the right and bottom + slivers for expanding the grid.",
      instructionsRename: "In Edit Mode, tap the pencil under a counter's path pill to rename it.",
      instructionsToolbar: "Use the top bar to open stats and settings, change mode, adjust count-by, manage edit mode, save or load layouts, and reset all.",
      aboutTitle: "About",
      aboutBody1: "Grid Counter is a touch-first nested tally app for tracking grouped counts on a phone-sized screen.",
      aboutBody2: "It runs as a web app for now, stores your session locally, and includes a stats view for activity over time.",
    },
    controls: {
      view: "View",
      mode: "Mode",
      increment: "Increment",
      decrement: "Decrement",
      step: "Count By",
      edit: "Edit",
      settingsMenu: "Settings",
      enterEditMode: "Enter Edit Mode",
      exitEditMode: "Exit Edit Mode",
      editMode: "Edit Mode",
      saveLayout: "Save Layout",
      loadLayout: "Load Layout",
      reset: "Reset",
      resetAll: "Reset All",
      hold: "Hold",
      appearance: "Appearance",
      theme: "Theme",
      language: "Language",
    },
    hold: {
      continuous: "Continuous",
      reset: "Reset",
      nothing: "Nothing",
    },
    themes: {
      dark: "Dark",
      light: "Light",
      mogged: "Mogged",
    },
    notices: {
      increment: "Tap a counter to add {step}.",
      decrement: "Tap a counter to subtract {step}.",
      tapReset: "Tap reset is armed. Tap any counter to zero it.",
      holdContinuous: "Hold keeps applying the current count action.",
      holdReset: "Hold resets the pressed counter.",
      holdNothing: "Hold does nothing.",
      renameHint: "Long press titles to rename counters and rows.",
    },
    counter: {
      addChild: "+Right",
      addSibling: "+Down",
      noSubcounters: "No subcounters yet",
      nestedCount: "{count} nested",
      fallbackTitle: "Counter",
      resetArmed: "Reset armed",
      addChildAria: "Add a subcounter to counter {path}",
      addSiblingAria: "Add a counter below counter {path}",
      removeAria: "Remove counter {path} and its dependent counters",
      renameAria: "Rename counter {path}",
    },
    row: {
      fallbackRoot: "Main Row",
      fallbackChild: "Row {path}",
      counterCount: "{count} counters",
    },
    rename: {
      nodePrompt: "Rename counter {path}",
      rowPrompt: "Rename row {path}",
    },
    stats: {
      summary: "Session Summary",
      timeline: "Tap Timeline",
      activeCounters: "Most Active Counters",
      noActivity: "No counter activity yet.",
      totalCounters: "Counters",
      totalTaps: "Tap Events",
      totalResets: "Resets",
      totalCount: "Net Count",
      elapsed: "Elapsed",
      peakMinute: "Peak Minute",
      averagePerMinute: "Avg Taps / Min",
      leader: "Highest Count",
      counterPath: "Counter {path}",
      currentCount: "Current {count}",
      taps: "{count} taps",
    },
    accessibility: {
      viewSwitcher: "View switcher",
      settings: "Counter settings",
      counterTree: "Counter tree",
      themePicker: "Theme picker",
      languagePicker: "Language picker",
    },
  },
  "es-ES": {
    app: {
      eyebrow: "Appmogged",
      titleLead: "Grid",
      titleTail: "Contador",
      description: "Contadores anidados pensados para tocar y contar rapido.",
      boardTitle: "Grid Contador",
      statsTitle: "Estadisticas de Grid Contador",
    },
    views: {
      board: "Contadores",
      stats: "Estadisticas",
    },
    dialogs: {
      instructionsMenu: "Instrucciones",
      aboutMenu: "Acerca de",
      close: "Cerrar",
      saveLayoutTitle: "Guardar Disposicion",
      loadLayoutTitle: "Cargar Disposicion",
      layoutName: "Nombre de la Disposicion",
      saveAction: "Guardar Disposicion",
      loadAction: "Cargar",
      saveLayoutHint: "Guarda solo la estructura y los titulos. Las cuentas empiezan en cero al cargarla.",
      noLayouts: "Todavia no hay disposiciones guardadas.",
      savedAt: "Guardado {date}",
      instructionsTitle: "Instrucciones",
      instructionsIntro: "Toca cualquier contador para cambiar su numero.",
      instructionsExpand: "Activa el modo de edicion para mostrar las franjas + de la derecha y abajo y ampliar la cuadricula.",
      instructionsRename: "En modo de edicion, toca el lapiz bajo la pastilla de ruta del contador para renombrarlo.",
      instructionsToolbar: "Usa la barra superior para abrir estadisticas y ajustes, cambiar el modo, el conteo, gestionar el modo de edicion, guardar o cargar disposiciones y reiniciar todo.",
      aboutTitle: "Acerca de",
      aboutBody1: "Grid Counter es una app de conteo anidado pensada para tocar y seguir grupos de valores en una pantalla tipo telefono.",
      aboutBody2: "Por ahora funciona como app web, guarda la sesion localmente e incluye una vista de estadisticas de actividad con el tiempo.",
    },
    controls: {
      view: "Vista",
      mode: "Modo",
      increment: "Incrementar",
      decrement: "Disminuir",
      step: "Contar De",
      edit: "Editar",
      settingsMenu: "Ajustes",
      enterEditMode: "Entrar en Modo de Edicion",
      exitEditMode: "Salir del Modo de Edicion",
      editMode: "Modo de Edicion",
      saveLayout: "Guardar Disposicion",
      loadLayout: "Cargar Disposicion",
      reset: "Reinicio",
      resetAll: "Reiniciar Todo",
      hold: "Mantener",
      appearance: "Apariencia",
      theme: "Tema",
      language: "Idioma",
    },
    hold: {
      continuous: "Continuo",
      reset: "Reiniciar",
      nothing: "Nada",
    },
    themes: {
      dark: "Oscuro",
      light: "Claro",
      mogged: "Mogged",
    },
    notices: {
      increment: "Toca un contador para sumar {step}.",
      decrement: "Toca un contador para restar {step}.",
      tapReset: "El reinicio por toque esta activo. Toca cualquier contador para ponerlo en cero.",
      holdContinuous: "Mantener aplica la accion actual repetidamente.",
      holdReset: "Mantener reinicia el contador presionado.",
      holdNothing: "Mantener no hace nada.",
      renameHint: "Mantener pulsados los titulos permite renombrar contadores y filas.",
    },
    counter: {
      addChild: "+Derecha",
      addSibling: "+Abajo",
      noSubcounters: "Todavia no hay subcontadores",
      nestedCount: "{count} anidados",
      fallbackTitle: "Contador",
      resetArmed: "Reinicio activo",
      addChildAria: "Agregar un subcontador al contador {path}",
      addSiblingAria: "Agregar un contador debajo del contador {path}",
      removeAria: "Eliminar el contador {path} y sus contadores dependientes",
      renameAria: "Renombrar contador {path}",
    },
    row: {
      fallbackRoot: "Fila Principal",
      fallbackChild: "Fila {path}",
      counterCount: "{count} contadores",
    },
    rename: {
      nodePrompt: "Renombrar contador {path}",
      rowPrompt: "Renombrar fila {path}",
    },
    stats: {
      summary: "Resumen de la Sesion",
      timeline: "Linea de Tiempo",
      activeCounters: "Contadores Mas Activos",
      noActivity: "Todavia no hay actividad.",
      totalCounters: "Contadores",
      totalTaps: "Toques",
      totalResets: "Reinicios",
      totalCount: "Cuenta Neta",
      elapsed: "Tiempo",
      peakMinute: "Minuto Pico",
      averagePerMinute: "Toques / Min",
      leader: "Mayor Cuenta",
      counterPath: "Contador {path}",
      currentCount: "Actual {count}",
      taps: "{count} toques",
    },
    accessibility: {
      viewSwitcher: "Selector de vista",
      settings: "Ajustes del contador",
      counterTree: "Arbol de contadores",
      themePicker: "Selector de tema",
      languagePicker: "Selector de idioma",
    },
  },
  "pt-PT": {
    app: {
      eyebrow: "Appmogged",
      titleLead: "Grid",
      titleTail: "Contador",
      description: "Contadores aninhados pensados para toque rapido.",
      boardTitle: "Grid Contador",
      statsTitle: "Estatisticas do Grid Contador",
    },
    views: {
      board: "Contadores",
      stats: "Estatisticas",
    },
    dialogs: {
      instructionsMenu: "Instrucoes",
      aboutMenu: "Sobre",
      close: "Fechar",
      saveLayoutTitle: "Guardar Esquema",
      loadLayoutTitle: "Abrir Esquema",
      layoutName: "Nome do Esquema",
      saveAction: "Guardar Esquema",
      loadAction: "Abrir",
      saveLayoutHint: "Guarda apenas a estrutura e os titulos. As contagens comecam a zero ao abrir.",
      noLayouts: "Ainda nao ha esquemas guardados.",
      savedAt: "Guardado {date}",
      instructionsTitle: "Instrucoes",
      instructionsIntro: "Toque em qualquer contador para mudar o numero.",
      instructionsExpand: "Ative o modo de edicao para mostrar as faixas + da direita e de baixo e expandir a grelha.",
      instructionsRename: "No modo de edicao, toque no lapis por baixo da pastilha de caminho do contador para o renomear.",
      instructionsToolbar: "Use a barra superior para abrir estatisticas e definicoes, ajustar o modo, a contagem, gerir o modo de edicao, guardar ou abrir esquemas e repor tudo.",
      aboutTitle: "Sobre",
      aboutBody1: "Grid Counter e uma app de contagem aninhada pensada para acompanhar grupos de valores num ecra de telemovel.",
      aboutBody2: "Para ja funciona como app web, guarda a sessao localmente e inclui uma vista de estatisticas de atividade ao longo do tempo.",
    },
    controls: {
      view: "Vista",
      mode: "Modo",
      increment: "Incrementar",
      decrement: "Diminuir",
      step: "Contar Por",
      edit: "Editar",
      settingsMenu: "Definicoes",
      enterEditMode: "Entrar no Modo de Edicao",
      exitEditMode: "Sair do Modo de Edicao",
      editMode: "Modo de Edicao",
      saveLayout: "Guardar Esquema",
      loadLayout: "Abrir Esquema",
      reset: "Repor",
      resetAll: "Repor Tudo",
      hold: "Pressionar",
      appearance: "Aparencia",
      theme: "Tema",
      language: "Idioma",
    },
    hold: {
      continuous: "Continuo",
      reset: "Repor",
      nothing: "Nada",
    },
    themes: {
      dark: "Escuro",
      light: "Claro",
      mogged: "Mogged",
    },
    notices: {
      increment: "Toque num contador para somar {step}.",
      decrement: "Toque num contador para subtrair {step}.",
      tapReset: "A reposicao por toque esta ativa. Toque em qualquer contador para o voltar a zero.",
      holdContinuous: "Pressionar aplica a acao atual repetidamente.",
      holdReset: "Pressionar repoe o contador selecionado.",
      holdNothing: "Pressionar nao faz nada.",
      renameHint: "Pressione os titulos para renomear contadores e linhas.",
    },
    counter: {
      addChild: "+Direita",
      addSibling: "+Baixo",
      noSubcounters: "Ainda nao ha subcontadores",
      nestedCount: "{count} aninhados",
      fallbackTitle: "Contador",
      resetArmed: "Reposicao ativa",
      addChildAria: "Adicionar um subcontador ao contador {path}",
      addSiblingAria: "Adicionar um contador abaixo do contador {path}",
      removeAria: "Remover o contador {path} e os seus contadores dependentes",
      renameAria: "Renomear contador {path}",
    },
    row: {
      fallbackRoot: "Linha Principal",
      fallbackChild: "Linha {path}",
      counterCount: "{count} contadores",
    },
    rename: {
      nodePrompt: "Renomear contador {path}",
      rowPrompt: "Renomear linha {path}",
    },
    stats: {
      summary: "Resumo da Sessao",
      timeline: "Linha Temporal",
      activeCounters: "Contadores Mais Ativos",
      noActivity: "Ainda nao ha atividade.",
      totalCounters: "Contadores",
      totalTaps: "Toques",
      totalResets: "Reposicoes",
      totalCount: "Contagem Liquida",
      elapsed: "Tempo",
      peakMinute: "Minuto Pico",
      averagePerMinute: "Toques / Min",
      leader: "Maior Contagem",
      counterPath: "Contador {path}",
      currentCount: "Atual {count}",
      taps: "{count} toques",
    },
    accessibility: {
      viewSwitcher: "Alternador de vista",
      settings: "Definicoes do contador",
      counterTree: "Arvore de contadores",
      themePicker: "Seletor de tema",
      languagePicker: "Seletor de idioma",
    },
  },
} as const satisfies Record<SupportedLocale, TranslationBranch>;

let currentLocale: SupportedLocale = "en-US";

function resolveKey(tree: TranslationBranch, key: string): string {
  const branches = key.split(".");
  let current: string | TranslationBranch | undefined = tree;

  for (const branch of branches) {
    if (!current || typeof current === "string") {
      return key;
    }
    current = current[branch];
  }

  return typeof current === "string" ? current : key;
}

function applyInterpolations(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => String(values[token] ?? `{${token}}`));
}

export function setLocale(locale: SupportedLocale): void {
  currentLocale = locale;
  document.documentElement.lang = locale;
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function t(key: string, values?: Record<string, string | number>): string {
  const resolved = resolveKey(APP_TRANSLATIONS[currentLocale], key);
  return applyInterpolations(resolved, values);
}

export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }
    element.textContent = t(key);
  });

  root.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (!key) {
      return;
    }
    element.setAttribute("aria-label", t(key));
  });
}
