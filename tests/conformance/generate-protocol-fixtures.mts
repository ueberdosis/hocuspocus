/**
 * Generates golden-vector fixtures for the Rust protocol crate
 * (crates/hocuspocus-protocol/tests/fixtures/frames.json) by driving the
 * REAL TypeScript implementations: OutgoingMessage, @hocuspocus/common
 * auth encoding, lib0, y-protocols and yjs.
 *
 * Run from the repo root:
 *
 *   node --experimental-transform-types --conditions=source \
 *     tests/conformance/generate-protocol-fixtures.mts
 *
 * The output is committed; regenerate only when the wire protocol itself
 * changes (which should be never — it is the compatibility contract).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";

import { OutgoingMessage } from "../../packages/server/src/OutgoingMessage.ts";
import { MessageType } from "../../packages/server/src/types.ts";
import { writeAuthentication } from "../../packages/common/src/auth.ts";

type Fixture = {
	name: string;
	kind:
		| "envelope"
		| "bare"
		| "awareness_update"
		| "redis"
		| "yjs_update"
		| "state_vector";
	base64: string;
	expect: Record<string, unknown>;
};

const fixtures: Fixture[] = [];

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

const push = (name: string, kind: Fixture["kind"], bytes: Uint8Array, expect: Record<string, unknown>) =>
	fixtures.push({ name, kind, base64: b64(bytes), expect });

// ---------------------------------------------------------------------------
// A document with content, used for sync fixtures.
// ---------------------------------------------------------------------------

const doc = new Y.Doc();
doc.getText("default").insert(0, "Hello from hocuspocus");
doc.getMap("meta").set("version", 1);

const fullUpdate = Y.encodeStateAsUpdate(doc);
const stateVector = Y.encodeStateVector(doc);

push("yjs full update", "yjs_update", fullUpdate, {
	text_name: "default",
	text_content: "Hello from hocuspocus",
	map_name: "meta",
	map_key: "version",
	map_value: 1,
});

push("yjs state vector", "state_vector", stateVector, {});

// ---------------------------------------------------------------------------
// Server → client envelopes via the real OutgoingMessage.
// ---------------------------------------------------------------------------

const envelope = (
	name: string,
	documentName: string,
	build: (message: OutgoingMessage) => OutgoingMessage,
	expect: Record<string, unknown>,
) => {
	const bytes = build(new OutgoingMessage(documentName)).toUint8Array();
	push(name, "envelope", bytes, { address: documentName, ...expect });
};

envelope("authenticated read-write", "my-doc", (m) => m.writeAuthenticated(false), {
	message_type: MessageType.Auth,
	auth: { authenticated_scope: "read-write" },
});

envelope("authenticated readonly", "my-doc", (m) => m.writeAuthenticated(true), {
	message_type: MessageType.Auth,
	auth: { authenticated_scope: "readonly" },
});

envelope("permission denied", "my-doc", (m) => m.writePermissionDenied("permission-denied"), {
	message_type: MessageType.Auth,
	auth: { permission_denied_reason: "permission-denied" },
});

envelope("token sync request", "my-doc", (m) => m.writeTokenSyncRequest(), {
	message_type: MessageType.Auth,
	auth: { token_request: true },
});

envelope("query awareness", "my-doc", (m) => m.writeQueryAwareness(), {
	message_type: MessageType.QueryAwareness,
});

envelope("stateless with unicode", "my-doc", (m) => m.writeStateless('{"msg":"héllo — ✓"}'), {
	message_type: MessageType.Stateless,
	stateless_payload: '{"msg":"héllo — ✓"}',
});

envelope("broadcast stateless", "my-doc", (m) => m.writeBroadcastStateless("relayed"), {
	message_type: MessageType.BroadcastStateless,
	stateless_payload: "relayed",
});

envelope("sync status saved", "my-doc", (m) => m.writeSyncStatus(true), {
	message_type: MessageType.SyncStatus,
	sync_status: true,
});

envelope("sync status unsaved", "my-doc", (m) => m.writeSyncStatus(false), {
	message_type: MessageType.SyncStatus,
	sync_status: false,
});

envelope("close with reason", "my-doc", (m) => m.writeCloseMessage("Reset Connection"), {
	message_type: MessageType.CLOSE,
	close_reason: "Reset Connection",
});

envelope(
	"sync step1 (server first sync step)",
	"my-doc",
	// The real server calls writeFirstSyncStepFor(document); a Y.Doc is
	// structurally sufficient here.
	(m) => m.createSyncMessage().writeFirstSyncStepFor(doc as never),
	{
		message_type: MessageType.Sync,
		sync: { subtype: 0, body_base64: b64(stateVector) },
	},
);

envelope("sync reply with update", "my-doc", (m) => m.createSyncReplyMessage().writeUpdate(fullUpdate), {
	message_type: MessageType.SyncReply,
	sync: { subtype: 2, body_base64: b64(fullUpdate) },
});

envelope(
	"session-aware address",
	"my-doc\u0000session-123",
	(m) => m.writeSyncStatus(true),
	{
		document_name: "my-doc",
		session_id: "session-123",
		message_type: MessageType.SyncStatus,
		sync_status: true,
	},
);

envelope("unicode document name", "döc-…-✓", (m) => m.writeSyncStatus(true), {
	message_type: MessageType.SyncStatus,
	sync_status: true,
});

// ---------------------------------------------------------------------------
// Client → server auth frames via the real common encoder
// (mirrors provider AuthenticationMessage.ts).
// ---------------------------------------------------------------------------

{
	const encoder = encoding.createEncoder();
	encoding.writeVarString(encoder, "my-doc");
	encoding.writeVarUint(encoder, MessageType.Auth);
	writeAuthentication(encoder, "s3cret-token");
	encoding.writeVarString(encoder, "9.9.9");
	push("client auth with providerVersion", "envelope", encoding.toUint8Array(encoder), {
		address: "my-doc",
		message_type: MessageType.Auth,
		auth: { token: "s3cret-token", provider_version: "9.9.9" },
	});
}

{
	const encoder = encoding.createEncoder();
	encoding.writeVarString(encoder, "my-doc");
	encoding.writeVarUint(encoder, MessageType.Auth);
	writeAuthentication(encoder, "s3cret-token");
	push("client auth without providerVersion (old provider)", "envelope", encoding.toUint8Array(encoder), {
		address: "my-doc",
		message_type: MessageType.Auth,
		auth: { token: "s3cret-token", provider_version: null },
	});
}

// ---------------------------------------------------------------------------
// Bare connection-level ping/pong (HocuspocusProviderWebsocket).
// ---------------------------------------------------------------------------

push("bare ping", "bare", new Uint8Array([MessageType.Ping]), { ping: true });
push("bare pong", "bare", new Uint8Array([MessageType.Pong]), { pong: true });

// ---------------------------------------------------------------------------
// Awareness: real y-protocols awareness updates (inner bytes, i.e. what the
// envelope's varUint8Array wraps).
// ---------------------------------------------------------------------------

{
	const awarenessDoc = new Y.Doc();
	const awareness = new awarenessProtocol.Awareness(awarenessDoc);
	const localClock = () => awareness.meta.get(awarenessDoc.clientID)?.clock;

	awareness.setLocalState({ user: { name: "jan", color: "#ffcc00" } });
	const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [awarenessDoc.clientID]);
	push("awareness update with state", "awareness_update", update, {
		entries: [
			{
				client_id: awarenessDoc.clientID,
				clock: localClock(),
				state: { user: { name: "jan", color: "#ffcc00" } },
			},
		],
	});

	awareness.setLocalState(null);
	const removal = awarenessProtocol.encodeAwarenessUpdate(awareness, [awarenessDoc.clientID]);
	push("awareness removal (null state)", "awareness_update", removal, {
		entries: [{ client_id: awarenessDoc.clientID, clock: localClock(), state: null }],
	});

	// Envelope wrapping, exactly like the server broadcasts it.
	const message = new OutgoingMessage("my-doc").createAwarenessUpdateMessage(awareness, [
		awarenessDoc.clientID,
	]);
	push("awareness envelope", "envelope", message.toUint8Array(), {
		address: "my-doc",
		message_type: MessageType.Awareness,
		awareness_inner_base64: b64(removal),
	});
}

// ---------------------------------------------------------------------------
// Redis pub/sub frame: [u8 identifier length][identifier][wire message] —
// layout from packages/extension-redis/src/Redis.ts encodeMessage().
// ---------------------------------------------------------------------------

{
	const inner = new OutgoingMessage("my-doc").writeSyncStatus(true).toUint8Array();
	const identifier = "host-fixture";
	const frame = Buffer.concat([
		Buffer.from([identifier.length]),
		Buffer.from(identifier, "utf-8"),
		inner,
	]);
	push("redis frame", "redis", frame, {
		identifier,
		inner_base64: b64(inner),
	});
}

// ---------------------------------------------------------------------------

const out = {
	generated_by: "tests/conformance/generate-protocol-fixtures.mts",
	note: "Golden vectors produced by the TypeScript implementation. Do not edit by hand.",
	fixtures,
};

const target = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../crates/hocuspocus-protocol/tests/fixtures/frames.json",
);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(out, null, "\t")}\n`);
console.log(`wrote ${fixtures.length} fixtures to ${target}`);
