// Game server entry point: `npm run server`. Listens on PORT (default config.net.defaultPort).
import { CONFIG } from '../shared/config.js';
import { createGameServer } from './createServer.js';

const port = Number(process.env.PORT) || CONFIG.net.defaultPort;
const server = createGameServer();
await server.listen(port);
console.log(`Game server listening on ws://localhost:${port}`);
