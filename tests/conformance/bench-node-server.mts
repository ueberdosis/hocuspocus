/**
 * Benchmark helper: runs the TypeScript hocuspocus server as a child
 * process with the same ready-line contract as the Rust binary.
 */

import { Server } from "../../packages/server/src/index.ts";

const server = new Server({ port: 0, quiet: true, stopOnSignals: false });
const hocuspocus = await server.listen();
const address = hocuspocus.server!.address as { port: number };
console.log(JSON.stringify({ port: address.port }));
