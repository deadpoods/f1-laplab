const CACHE='laplab-2024-1-v03-experiments-rooms';
const FILES=['./','./index.html','./style.css','./themes.css','./theme-boot.js','./themes.mjs','./app.mjs','./engine.mjs','./research.mjs','./worker.mjs','./lab.mjs','./lab-worker.mjs','./lab-ui.mjs','./game.mjs','./compete-ui.mjs','./rooms-config.mjs','./features.css','./data/dataset.json','./assets/mark.svg','./assets/fonts.css','./assets/Manrope.ttf','./assets/Oswald.ttf','./assets/InstrumentSerif.ttf','./assets/SpaceGrotesk.ttf','./assets/norris-silverstone.jpg','./assets/russell-silverstone.jpg',...Array.from({length:7},(_,i)=>`./assets/font-${i}.ttf`)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('laplab-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 // Refresh presentation code on reload; retain the complete lab for offline use.
 if(event.request.mode==='navigate'||['script','style','worker'].includes(event.request.destination)){
  const fallback=()=>caches.open(CACHE).then(cache=>cache.match(event.request.mode==='navigate'?'./index.html':event.request));
  event.respondWith(fetch(event.request).then(response=>response.ok?response:fallback()).catch(fallback));return;
 }
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(cached=>cached||fetch(event.request)));
});
