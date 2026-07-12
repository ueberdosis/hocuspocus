/**
 * Webhook change-event smoke: the binary posts a debounced `change` event
 * whose base64 payload is the incremental yjs update since the previous
 * event — decodable by a plain Y.Doc.
 *
 * Usage: node --experimental-transform-types --conditions=source \
 *   tests/conformance/smoke-webhook-change.mts
 */

import { spawn } from "node:child_process";
import http from "node:http";
import * as Y from "yjs";
import { HocuspocusProvider } from "../../packages/provider/src/HocuspocusProvider.ts";
import { HocuspocusProviderWebsocket } from "../../packages/provider/src/HocuspocusProviderWebsocket.ts";

let changeEvent: { documentName: string; update: string } | undefined;
const receiver = http.createServer((req, res) => {
  let body = ""; req.on("data", c => body += c);
  req.on("end", () => {
    const parsed = JSON.parse(body);
    if (parsed.event === "change") changeEvent = parsed.payload;
    res.writeHead(200, {"Content-Type": "application/json"}); res.end("{}");
  });
});
await new Promise<void>(r => receiver.listen(0, "127.0.0.1", r));
const receiverPort = (receiver.address() as {port:number}).port;

const server = spawn("target/debug/hocuspocus-server", [], {
  env: { ...process.env, HOCUSPOCUS_SERVER__LISTEN: "127.0.0.1:0", HOCUSPOCUS_SERVER__QUIET: "true",
    HOCUSPOCUS_SERVER__DEBOUNCE_MS: "300",
    HOCUSPOCUS_WEBHOOK__URL: `http://127.0.0.1:${receiverPort}`,
    HOCUSPOCUS_WEBHOOK__SECRET: "s", HOCUSPOCUS_WEBHOOK__EVENTS: "change" },
  stdio: ["ignore", "pipe", "inherit"],
});
const { port } = JSON.parse(await new Promise<string>(r => server.stdout.once("data", d => r(String(d).split("\n")[0]))));
const document = new Y.Doc();
const socket = new HocuspocusProviderWebsocket({ url: `ws://127.0.0.1:${port}` });
const provider = new HocuspocusProvider({ websocketProvider: socket, name: "change-doc", document });
provider.attach();
await new Promise<void>(r => provider.on("synced", () => r()));
document.getText("default").insert(0, "change event payload test");
await new Promise(r => setTimeout(r, 1200));

if (!changeEvent) { console.log("FAIL: no change event"); process.exit(1); }
const check = new Y.Doc();
Y.applyUpdate(check, Buffer.from(changeEvent.update, "base64"));
const text = check.getText("default").toString();
console.log(changeEvent.documentName === "change-doc" && text === "change event payload test"
  ? "OK: change event carries decodable update with correct content"
  : `FAIL: got ${changeEvent.documentName} / ${JSON.stringify(text)}`);
provider.detach(); socket.destroy(); server.kill(); receiver.close();
process.exit(0);
