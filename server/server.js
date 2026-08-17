/* ============================================================
   СЪРВЪРЪТ НА ИГРАТА
   ------------------------------------------------------------
   Прави две неща наведнъж, на един и същ адрес:

   1. Отваря играта на http://localhost:8080
   2. Свързва се към чата на TikTok LIVE и подава гласовете
      на играта (браузърът няма как да го направи сам)

   Не се пуска директно — пусни START.bat в горната папка.
   ============================================================ */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const ROOT = path.join(__dirname, '..');          // папката с index.html

/* ---------- 1. раздаване на файловете на играта ---------- */
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',   '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.woff2':'font/woff2', '.mp3':'audio/mpeg'
};

const httpServer = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if(rel === '/' || rel === '') rel = '/index.html';

  const file = path.join(ROOT, path.normalize(rel));
  if(!file.startsWith(ROOT)){                      // защита срещу ../../
    res.writeHead(403); res.end('403'); return;
  }
  fs.readFile(file, (err, data) => {
    if(err){
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
      res.end('Няма такъв файл: ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

/* ---------- 2. връзка с TikTok ---------- */
let conn = null;
let currentUser = "";
let viewers = 0;

const wss = new WebSocketServer({ server: httpServer });   // същият порт като играта

function send(ws, obj){ if(ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); }
function broadcast(obj){
  const s = JSON.stringify(obj);
  for(const c of wss.clients) if(c.readyState === c.OPEN) c.send(s);
}
function status(extra = {}){
  return { type:"status", connected: !!(conn && currentUser), user: currentUser, viewers, ...extra };
}

// работи и със стария, и с новия формат на библиотеката
function readChat(data){
  const u = data.user || {};
  return {
    type: "chat",
    userId: String(u.id || u.displayId || data.userId || data.uniqueId || ""),
    nick:  String(u.nickname || u.displayId || data.nickname || data.uniqueId || "зрител"),
    text:  String(data.content ?? data.comment ?? "")
  };
}
const readViewers = d => Number(d.totalUser || d.total || d.viewerCount || 0) || 0;

async function disconnectTikTok(){
  if(!conn) return;
  try{ conn.disconnect(); }catch(e){}
  conn = null; currentUser = ""; viewers = 0;
}

async function connectTikTok(rawName){
  const username = String(rawName || "").trim().replace(/^@/, "");
  if(!username){ broadcast({ type:"error", message:"Липсва потребителско име." }); return; }

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
    broadcast(status());
  });
  c.on(ControlEvent.ERROR, err => console.error("! Грешка:", err?.message || err));

  try{
    await c.connect();
    conn = c; currentUser = username;
    console.log(`✓ Свързан към @${username}. Коментарите вече текат към играта.`);
    broadcast(status());
  }catch(err){
    const msg = err?.message || String(err);
    console.error(`✗ Неуспешна връзка към @${username}: ${msg}`);
    broadcast({ type:"error", message: /offline|not found|isn't online|LIVE/i.test(msg)
      ? `@${username} не е на живо в момента.`
      : `Грешка при свързване: ${msg}` });
    broadcast(status());
  }
}

wss.on("connection", ws => {
  send(ws, status());
  ws.on("message", raw => {
    let msg; try{ msg = JSON.parse(raw.toString()); }catch{ return; }
    if(msg.type === "connect")    connectTikTok(msg.username);
    if(msg.type === "disconnect") disconnectTikTok().then(()=> broadcast(status()));
    if(msg.type === "ping")       send(ws, status());
  });
});

/* ---------- пускане ---------- */
function localIP(){
  for(const list of Object.values(os.networkInterfaces()))
    for(const n of list || [])
      if(n.family === "IPv4" && !n.internal) return n.address;
  return null;
}

httpServer.listen(PORT, () => {
  const ip = localIP();
  console.log(`
╔══════════════════════════════════════════════════════╗
║              ЗНАЕШ ЛИ?  —  сървърът работи           ║
╚══════════════════════════════════════════════════════╝

  Играта е тук:      http://localhost:${PORT}
${ip ? `  От телефон/друг компютър в същата мрежа:
                     http://${ip}:${PORT}\n` : ""}
  1. Отвори горния адрес в браузъра
  2. Напиши името си в полето "TikTok LIVE" и натисни "Свържи"
  3. Зрителите гласуват в чата с 1, 2, 3, 4 (или А, Б, В, Г)

  ВАЖНО: този прозорец трябва да остане отворен.
  Спиране: Ctrl + C
`);
});

// име от командния ред: START.bat @име
const fromArgs = process.argv.slice(2).find(a => !a.startsWith("-"));
if(fromArgs || process.env.TIKTOK_USER) connectTikTok(fromArgs || process.env.TIKTOK_USER);

process.on("SIGINT", () => { disconnectTikTok(); process.exit(0); });
