const CACHE_NAME = "drive-assist-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./favicon.svg",
    "./manifest.json",
    "./bootstrap.min.css"
];


// =========================================================
// INSTALL
// =========================================================

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(APP_FILES);

            })
    );

    self.skipWaiting();
});


// =========================================================
// ACTIVATE
// =========================================================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(cacheNames => {

                return Promise.all(

                    cacheNames
                        .filter(name =>
                            name !== CACHE_NAME
                        )
                        .map(name =>
                            caches.delete(name)
                        )
                );

            })
    );

    self.clients.claim();
});


// =========================================================
// FETCH
// =========================================================

self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(event.request)
            .then(cachedResponse => {

                if (cachedResponse) {

                    return cachedResponse;
                }


                return fetch(event.request);

            })
    );
});