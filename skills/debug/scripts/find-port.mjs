import net from 'node:net';

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(start = 9876) {
  for (let port = start; port < start + 100; port++) {
    if (await isPortAvailable(port)) {
      console.log(port);
      return;
    }
  }
  console.error('No available port found');
  process.exit(1);
}

findAvailablePort();
