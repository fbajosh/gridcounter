const PWA_CACHE_REFRESH_PARAM = "__refresh_cache__";
const CACHE_PREFIX = "gridcounter";

function normalizedBasePath(): string {
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function isManagedCacheName(cacheName: string): boolean {
  return cacheName.startsWith(`${CACHE_PREFIX}-precache-`) || cacheName.startsWith(`${CACHE_PREFIX}-runtime-`);
}

function refreshUrlWithBypassToken(): string {
  const url = new URL(window.location.href);
  url.searchParams.set(PWA_CACHE_REFRESH_PARAM, Date.now().toString());
  return url.toString();
}

export function stripPwaCacheRefreshParamFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PWA_CACHE_REFRESH_PARAM)) {
    return;
  }

  url.searchParams.delete(PWA_CACHE_REFRESH_PARAM);
  const cleanedUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", cleanedUrl);
}

function installUpdateCheckHooks(registration: ServiceWorkerRegistration): void {
  const checkForUpdates = (): void => {
    void registration.update().catch(() => {
      // Ignore update check failures and keep the current app usable.
    });
  };

  window.addEventListener("focus", checkForUpdates);
  window.addEventListener("pageshow", checkForUpdates);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdates();
    }
  });

  checkForUpdates();
}

export function registerPwaServiceWorker(): void {
  if (!import.meta.env.PROD || !window.isSecureContext || !("serviceWorker" in navigator)) {
    return;
  }

  const basePath = normalizedBasePath();
  const serviceWorkerUrl = `${basePath}service-worker.js`;
  const hadController = navigator.serviceWorker.controller !== null;
  let reloadedForUpdatedController = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloadedForUpdatedController) {
      return;
    }

    reloadedForUpdatedController = true;
    window.location.reload();
  });

  void navigator.serviceWorker
    .register(serviceWorkerUrl, {
      scope: basePath,
      updateViaCache: "none",
    })
    .then((registration) => {
      installUpdateCheckHooks(registration);
    })
    .catch(() => {
      // The app still works without offline support if registration fails.
    });
}

export async function refreshPwaOfflineCache(): Promise<void> {
  const refreshUrl = refreshUrlWithBypassToken();

  if (!navigator.onLine) {
    window.alert("offline cache refresh requires an online connection.");
    return;
  }

  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("caches" in window)) {
    window.location.replace(refreshUrl);
    return;
  }

  const basePath = normalizedBasePath();
  const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
  await Promise.all(
    registrations
      .filter((registration) => {
        try {
          const scopeUrl = new URL(registration.scope);
          return scopeUrl.origin === window.location.origin && scopeUrl.pathname.startsWith(basePath);
        } catch {
          return false;
        }
      })
      .map((registration) => registration.unregister().catch(() => false)),
  );

  const cacheNames = await caches.keys().catch(() => []);
  await Promise.all(
    cacheNames.filter(isManagedCacheName).map((cacheName) => caches.delete(cacheName).catch(() => false)),
  );

  window.location.replace(refreshUrl);
}
