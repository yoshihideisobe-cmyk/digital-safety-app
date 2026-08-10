const CACHE_NAME = 'digital-safety-v1';
const STATIC_ASSETS = [
  '/',
  '/driver',
  '/driver/complete',
  '/admin',
  '/manifest.json',
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 古いキャッシュの削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// フェッチ時の処理 (Network First戦略)
self.addEventListener('fetch', (event) => {
  // APIリクエストはキャッシュしない
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        // オフライン時のAPIリクエストエラー処理
        return new Response(
          JSON.stringify({ offline: true, message: '現在オフラインです' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // レスポンスをキャッシュに保存
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});

// バックグラウンド同期（通信復帰時の自動再送補助）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pledges') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_OFFLINE_PLEDGES' });
        });
      })
    );
  }
});

