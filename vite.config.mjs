import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { defineConfig } from "vite";

const ROUTE_ENTRYPOINTS = ["stats"];
const SERVICE_WORKER_FILENAME = "service-worker.js";

function normalizedBasePath(base) {
  const trimmed = (base || "/").replace(/\/+$/, "");
  return trimmed ? `${trimmed}/` : "/";
}

async function listFilesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function buildServiceWorkerSource({ basePath, buildVersion, precacheUrls }) {
  return `const PRECACHE_CACHE_NAME = ${JSON.stringify(`counterapp-precache-${buildVersion}`)};
const RUNTIME_CACHE_NAME = ${JSON.stringify(`counterapp-runtime-${buildVersion}`)};
const BASE_PATH = ${JSON.stringify(basePath)};
const BASE_ROOT = BASE_PATH === "/" ? "" : BASE_PATH.replace(/\\/$/, "");
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE_CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName === PRECACHE_CACHE_NAME || cacheName === RUNTIME_CACHE_NAME) {
            return Promise.resolve(false);
          }

          if (cacheName.startsWith("counterapp-precache-") || cacheName.startsWith("counterapp-runtime-")) {
            return caches.delete(cacheName);
          }

          return Promise.resolve(false);
        }),
      ),
    ),
  );
  self.clients.claim();
});

function navigationCacheKey(pathname) {
  const normalizedPath = pathname.replace(/\\/+$/, "") || "/";

  if (BASE_PATH === "/") {
    if (normalizedPath === "/") {
      return "/index.html";
    }
  } else if (normalizedPath === BASE_ROOT) {
    return \`\${BASE_PATH}index.html\`;
  }

  if (normalizedPath === \`\${BASE_ROOT}/stats\`) {
    return \`\${BASE_PATH}stats/index.html\`;
  }

  return null;
}

async function respondToNavigation(request, url) {
  const precache = await caches.open(PRECACHE_CACHE_NAME);
  const runtime = await caches.open(RUNTIME_CACHE_NAME);
  const cacheKey = navigationCacheKey(url.pathname);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      void runtime.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedRuntimeResponse = await runtime.match(request);
    if (cachedRuntimeResponse) {
      return cachedRuntimeResponse;
    }

    if (cacheKey) {
      const cachedRoute = await precache.match(cacheKey);
      if (cachedRoute) {
        return cachedRoute;
      }
    }

    const fallbackResponse =
      (await precache.match(\`\${BASE_PATH}index.html\`)) ??
      (await precache.match(\`\${BASE_PATH}404.html\`));
    if (fallbackResponse) {
      return fallbackResponse;
    }

    throw error;
  }
}

async function respondToAsset(request) {
  const precache = await caches.open(PRECACHE_CACHE_NAME);
  const cachedPrecacheResponse = await precache.match(request);
  if (cachedPrecacheResponse) {
    return cachedPrecacheResponse;
  }

  const runtime = await caches.open(RUNTIME_CACHE_NAME);
  const cachedRuntimeResponse = await runtime.match(request);
  if (cachedRuntimeResponse) {
    return cachedRuntimeResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    void runtime.put(request, networkResponse.clone());
  }

  return networkResponse;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(respondToNavigation(request, url));
    return;
  }

  event.respondWith(respondToAsset(request));
});
`;
}

function emitRouteEntrypoints() {
  let outputDirectory = "";
  let basePath = "/";

  return {
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
      basePath = normalizedBasePath(config.base);
    },
    name: "emit-route-entrypoints",
    async writeBundle() {
      const indexHtml = await readFile(resolve(outputDirectory, "index.html"), "utf8");

      for (const route of ROUTE_ENTRYPOINTS) {
        const routeDirectory = resolve(outputDirectory, route);
        await mkdir(routeDirectory, { recursive: true });
        await writeFile(resolve(routeDirectory, "index.html"), indexHtml, "utf8");
      }

      await writeFile(resolve(outputDirectory, "404.html"), indexHtml, "utf8");

      const buildVersion = process.env.VITE_BUILD_VERSION?.trim() || "dev";
      const emittedFiles = await listFilesRecursively(outputDirectory);
      const precacheUrls = emittedFiles
        .filter((filePath) => relative(outputDirectory, filePath) !== SERVICE_WORKER_FILENAME)
        .map((filePath) => relative(outputDirectory, filePath).replace(/\\/g, "/"))
        .sort()
        .map((relativePath) => `${basePath}${relativePath}`);

      const serviceWorkerSource = buildServiceWorkerSource({
        basePath,
        buildVersion,
        precacheUrls,
      });

      await writeFile(resolve(outputDirectory, SERVICE_WORKER_FILENAME), serviceWorkerSource, "utf8");
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [emitRouteEntrypoints()],
  root: "src",
  base: command === "build" ? "/counterapp/" : "/",
  build: {
    emptyOutDir: true,
    outDir: "../dist",
  },
}));
