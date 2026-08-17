/* ============================================================
   МОСТ КЪМ TIKTOK LIVE
   ------------------------------------------------------------
   Браузърът няма как да се свърже директно към чата на TikTok.
   Този малък сървър го прави вместо него и препраща коментарите
   към играта по локален WebSocket на ws://localhost:8787

   Пускане:  npm start            (после въведи името в играта)
             npm start -- @име    (свързва се веднага)
   ============================================================ */

const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8787);

let conn = null;          // текущата връзка към TikTok
let currentUser = "";     // към кого сме свързани
let viewers = 0;

/* ---------- локален WebSocket към играта ---------- */
const wss = new WebSocketServer({ port: PORT });

function send(ws, obj){
  if(ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}
function broadcast(obj){
  const s = JSON.stringify(obj);
  for(const c of wss.clients) if(c.readyState === c.OPEN) c.send(s);
}
function status(extra = {}){
  return { type:"status", connected: !!(conn && currentUser), user: currentUser, viewers, ...extra };
}

/* ---------- нормализиране: работи и със стария, и с новия формат ---------- */
function readChat(data){
  const u = data.user || {};
  return {
    type: "chat",
    userId: String(u.id || u.displayId || data.userId || data.uniqueId || ""),
    nick:  String(u.nickname || u.displayId || data.nickname || data.uniqueId || "зрител"),
    text:  String(data.content ?? data.comment ?? "")
  };
}
function readViewers(data){
  return Number(data.totalUser || data.total || data.viewerCount || 0) || 0;
}

/* ---------- връзка към TikTok ---------- */
async function disconnectTikTok(){
  if(!conn) return;
  try{ conn.disconnect(); }catch(e){}
  conn = null;
  currentUser = "";
  viewers = 0;
}

async function connectTikTok(rawName){
  const username = String(rawName || "").trim().replace(/^@/, "");
  if(!username){
    broadcast({ type:"error", message:"Липсва потребителско име." });
    return;
  }

  await disconnectTikTok();
  broadcast({ type:"info", message:`Свързване към @${username}…` });
  console.log(`\n→ Свързване към @${username} …`);

  const c = new TikTokLiveConnection(username, { processInitialData: false });

  c.on(WebcastEvent.CHAT, data => {
    const m = readChat(data);
    if(m.text) broadcast(m);
  });

  c.on(WebcastEvent.ROOM_USER, data => {
    const n = readViewers(data);
    if(n){ viewers = n; broadcast(status()); }
  });

  c.on(WebcastEvent.STREAM_END, () => {
    console.log("← Streamът приключи.");
    broadcast({ type:"info", message:"Streamът приключи." });
    disconnectTikTok().then(()=> broadcast(status()));
  });

  c.on(ControlEvent.DISCONNECTED, () => {
    console.log("← Връзката с TikTok прекъсна.");
    currentUser = "";
    broadcast(status({ }));
  });

  c.on(ControlEvent.ERROR, err => {
    console.error("! Грешка:", err?.message || err);
  });

  try{
    await c.connect();
    conn = c;
    currentUser = username;
    console.log(`✓ Свързан към @${username}. Коментарите вече текат към играта.`);
    broadcast(status());
  }catch(err){
    const msg = err?.message || String(err);
    console.error(`✗ Неуспешна връзка към @${username}: ${msg}`);
    // най-честата причина е, че човекът просто не е на живо в момента
    broadcast({ type:"error", message: /offline|not found|isn't online|LIVE/i.test(msg)
      ? `@${username} не е на живо в момента.`
      : `Грешка при свързване: ${msg}` });
    broadcast(status());
  }
}

/* ---------- игра → сървър ---------- */
wss.on("connection", ws => {
  console.log("• Играта се свърза към моста.");
  send(ws, status());

  ws.on("message", raw => {
    let msg;
    try{ msg = JSON.parse(raw.toString()); }catch{ return; }

    if(msg.type === "connect")    connectTikTok(msg.username);
    if(msg.type === "disconnect") disconnectTikTok().then(()=> broadcast(status()));
    if(msg.type === "ping")       send(ws, status());
  });

  ws.on("close", () => console.log("• Играта се разкачи от моста."));
});

console.log(`
╔════════════════════════════════════════════════╗
║   Мост към TikTok LIVE — "Знаеш ли?"           ║
╚════════════════════════════════════════════════╝
Слуша на  ws://localhost:${PORT}

1. Отвори index.html в браузъра
2. В полето "TikTok LIVE" въведи своето име и натисни "Свържи"
3. Зрителите гласуват в чата с 1, 2, 3, 4 (или А, Б, В, Г)

Спиране: Ctrl + C
`);

// име, подадено от командния ред: npm start -- @име
const fromArgs = process.argv.slice(2).find(a => !a.startsWith("-"));
const fromEnv  = process.env.TIKTOK_USER;
if(fromArgs || fromEnv) connectTikTok(fromArgs || fromEnv);

process.on("SIGINT", () => { disconnectTikTok(); process.exit(0); });
