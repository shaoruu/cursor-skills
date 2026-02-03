import http from 'node:http';
import fs from 'node:fs';

const PORT = parseInt(process.argv[2], 10) || 9877;
const LOG_FILE = process.argv[3];

if (!LOG_FILE) {
  console.error('Usage: node viewer.mjs <port> <log-file-path>');
  process.exit(1);
}

const HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Debug Log Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
      background: #0d1117;
      color: #c9d1d9;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 12px 16px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    header h1 { font-size: 14px; font-weight: 500; }
    header .status {
      font-size: 12px;
      color: #7d8590;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    header .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3fb950;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .controls {
      padding: 8px 16px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
    }
    .controls label {
      font-size: 12px;
      color: #7d8590;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .controls input[type="checkbox"] {
      accent-color: #58a6ff;
    }
    .controls button {
      padding: 4px 12px;
      font-size: 12px;
      background: #21262d;
      border: 1px solid #30363d;
      color: #c9d1d9;
      border-radius: 6px;
      cursor: pointer;
    }
    .controls button:hover { background: #30363d; }
    #log {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .entry {
      padding: 8px 12px;
      margin-bottom: 4px;
      background: #161b22;
      border-radius: 6px;
      border-left: 3px solid #30363d;
      font-size: 13px;
      line-height: 1.5;
    }
    .entry:hover { background: #1c2128; }
    .entry .time {
      color: #7d8590;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .entry .data { white-space: pre-wrap; word-break: break-all; }
    .entry.error { border-left-color: #f85149; }
    .entry.warn { border-left-color: #d29922; }
    .entry.info { border-left-color: #58a6ff; }
    .empty {
      color: #7d8590;
      text-align: center;
      padding: 40px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Debug Log Viewer</h1>
    <div class="status"><div class="dot"></div>Live</div>
  </header>
  <div class="controls">
    <label><input type="checkbox" id="autoScroll" checked> Auto-scroll</label>
    <label><input type="checkbox" id="prettyPrint" checked> Pretty print JSON</label>
    <button onclick="clearLog()">Clear display</button>
  </div>
  <div id="log"><div class="empty">Waiting for log entries...</div></div>
  <script>
    const logEl = document.getElementById('log');
    const autoScrollEl = document.getElementById('autoScroll');
    const prettyPrintEl = document.getElementById('prettyPrint');
    let lastContent = '';
    let entries = [];

    function getLevel(data) {
      const str = typeof data === 'string' ? data.toLowerCase() : JSON.stringify(data).toLowerCase();
      if (str.includes('error') || str.includes('fail')) return 'error';
      if (str.includes('warn')) return 'warn';
      if (str.includes('info')) return 'info';
      return '';
    }

    function formatData(data) {
      if (!prettyPrintEl.checked) return data;
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch { return data; }
    }

    function renderEntries() {
      if (entries.length === 0) {
        logEl.innerHTML = '<div class="empty">Waiting for log entries...</div>';
        return;
      }
      logEl.innerHTML = entries.map(e => {
        const level = getLevel(e.data);
        return \`<div class="entry \${level}">
          <div class="time">\${e.time}</div>
          <div class="data">\${formatData(e.data)}</div>
        </div>\`;
      }).join('');
      if (autoScrollEl.checked) {
        logEl.scrollTop = logEl.scrollHeight;
      }
    }

    function parseLogContent(content) {
      const lines = content.trim().split('\\n').filter(Boolean);
      return lines.map(line => {
        const match = line.match(/^\\[([^\\]]+)\\]\\s*(.*)$/);
        if (match) {
          return { time: match[1], data: match[2] };
        }
        return { time: '', data: line };
      });
    }

    async function poll() {
      try {
        const res = await fetch('/logs');
        const content = await res.text();
        if (content !== lastContent) {
          lastContent = content;
          entries = parseLogContent(content);
          renderEntries();
        }
      } catch {}
      setTimeout(poll, 500);
    }

    function clearLog() {
      entries = [];
      renderEntries();
    }

    prettyPrintEl.addEventListener('change', renderEntries);
    poll();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (req.method === 'GET' && req.url === '/logs') {
    try {
      const content = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf-8') : '';
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(content);
    } catch {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Log viewer running at http://127.0.0.1:${PORT}`);
  console.log(`Watching: ${LOG_FILE}`);
  console.log(`PID: ${process.pid}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
