import { AuthMessageType } from "@hocuspocus/common";
import * as decoding from "lib0/decoding";
import { readVarString } from "lib0/decoding";
import * as encoding from "lib0/encoding";
import {
	Awareness,
	applyAwarenessUpdate,
	encodeAwarenessUpdate,
	modifyAwarenessUpdate,
} from "y-protocols/awareness";
import {
	messageYjsSyncStep1,
	messageYjsSyncStep2,
	messageYjsUpdate,
	readSyncStep1,
	readSyncStep2,
	readUpdate,
} from "y-protocols/sync";
import * as Y from "yjs";
import type Connection from "./Connection.ts";
import type Document from "./Document.ts";
import type { IncomingMessage } from "./IncomingMessage.ts";
import { OutgoingMessage } from "./OutgoingMessage.ts";
import {
	MessageType,
	type ConnectionTransactionOrigin,
	type TransactionOrigin,
} from "./types.ts";

// Updates that name a client twice keep the scratch Awareness, which collapses
// the entries into one; so do updates this check cannot read.
const needsScratchAwareness = (update: Uint8Array): boolean => {
	const decoder = decoding.createDecoder(update);
	const clientIds = new Set<number>();

	try {
		for (let i = decoding.readVarUint(decoder); i > 0; i--) {
			const clientId = decoding.readVarUint(decoder);

			if (clientIds.has(clientId)) {
				return true;
			}

			clientIds.add(clientId);
			decoding.readVarUint(decoder);
			decoding.readVarUint8Array(decoder);
		}
	} catch {
		return true;
	}

	return false;
};

// The removals of an update, the entries whose state re-encodes to null as on
// the scratch path, or null if it has none.
const awarenessRemovals = (update: Uint8Array): Uint8Array | null => {
	const decoder = decoding.createDecoder(update);
	const removals: [clientId: number, clock: number][] = [];

	for (let i = decoding.readVarUint(decoder); i > 0; i--) {
		const clientId = decoding.readVarUint(decoder);
		const clock = decoding.readVarUint(decoder);

		const state = JSON.parse(decoding.readVarString(decoder));

		if (JSON.stringify(state || null) === "null") {
			removals.push([clientId, clock]);
		}
	}

	if (removals.length === 0) {
		return null;
	}

	const encoder = encoding.createEncoder();
	encoding.writeVarUint(encoder, removals.length);
	for (const [clientId, clock] of removals) {
		encoding.writeVarUint(encoder, clientId);
		encoding.writeVarUint(encoder, clock);
		encoding.writeVarString(encoder, "null");
	}

	return encoding.toUint8Array(encoder);
};

export class MessageReceiver {
	message: IncomingMessage;

	defaultTransactionOrigin?: TransactionOrigin;

	constructor(
		message: IncomingMessage,
		defaultTransactionOrigin?: TransactionOrigin,
	) {
		this.message = message;
		this.defaultTransactionOrigin = defaultTransactionOrigin;
	}

	public async apply(
		document: Document,
		connection?: Connection,
		reply?: (message: Uint8Array) => void,
	) {
		const { message } = this;
		const type = message.readVarUint();
		const emptyMessageLength = message.length;

		switch (type) {
			case MessageType.Sync:
			case MessageType.SyncReply: {
				message.writeVarUint(MessageType.Sync);
				await this.readSyncMessage(
					message,
					document,
					connection,
					reply,
					type !== MessageType.SyncReply,
				);

				if (message.length > emptyMessageLength + 1) {
					if (reply) {
						reply(message.toUint8Array());
					} else if (connection) {
						connection.send(message.toUint8Array());
					}
				}

				break;
			}
			case MessageType.Awareness: {
				// The clients of a closed connection left with it. Of an update it sent
				// before closing, still queued or waiting in a hook, only the removals
				// apply: its states would bring those clients back.
				const applicable = (received: Uint8Array) =>
					connection !== undefined && !document.hasConnection(connection)
						? awarenessRemovals(received)
						: received;

				const received = applicable(message.readVarUint8Array());

				if (received === null) {
					break;
				}

				let update = received;

				const origin: TransactionOrigin = connection
					? ({
							source: "connection",
							connection,
						} satisfies ConnectionTransactionOrigin)
					: (this.defaultTransactionOrigin ?? { source: "local" });

				// A Document of an older @hocuspocus/server copy has no predicate.
				const hookActive =
					document.callbacks.isBeforeHandleAwarenessActive?.() ?? true;

				// No hook to run: skip the scratch Awareness, but re-encode as it does,
				// which also throws on a malformed update before any of it is applied.
				if (!hookActive && !needsScratchAwareness(update)) {
					applyAwarenessUpdate(
						document.awareness,
						modifyAwarenessUpdate(update, (state) => state || null),
						origin,
					);

					break;
				}

				// Decode the inbound update into a scratch Awareness so the hook
				// chain sees a high-level Map<clientId, state>. Mutations to that
				// map (including `set`, `delete`, and field changes on each state
				// object) are picked up by the re-encode below and forwarded as
				// the broadcast payload. Hooks may also throw to reject the
				// update entirely.
				const scratchDoc = new Y.Doc();
				const scratch = new Awareness(scratchDoc);
				// The Awareness constructor seeds the scratch's own random clientID
				// with `{}` at clock 0. Drop it so the hook and the re-encoded
				// update only ever see the clients from the inbound update. Its meta
				// entry has to go too, or it would show up as a removed client.
				scratch.getStates().delete(scratch.clientID);
				scratch.meta.delete(scratch.clientID);
				try {
					applyAwarenessUpdate(scratch, update, null);

					// A client that cleared its state has no entry in the map, but its
					// removal still has to reach the document's awareness. The hooks
					// get these removals as their own set, so they can inspect them
					// and drop any they don't allow.
					const removedClients = new Set(
						Array.from(scratch.meta.keys()).filter(
							(clientId) => !scratch.getStates().has(clientId),
						),
					);

					if (hookActive) {
						await document.callbacks.beforeHandleAwareness(
							document,
							scratch.getStates(),
							origin,
							removedClients,
						);
					}

					update = encodeAwarenessUpdate(scratch, [
						...new Set([...scratch.getStates().keys(), ...removedClients]),
					]);
				} finally {
					scratch.destroy();
					scratchDoc.destroy();
				}

				const result = applicable(update);

				if (result === null) {
					break;
				}

				applyAwarenessUpdate(document.awareness, result, origin);

				break;
			}
			case MessageType.QueryAwareness: {
				this.applyQueryAwarenessMessage(document, connection, reply);

				break;
			}
			case MessageType.Stateless: {
				connection?.callbacks.statelessCallback({
					connection,
					documentName: document.name,
					document,
					payload: readVarString(message.decoder),
				});

				break;
			}
			case MessageType.BroadcastStateless: {
				// Server-internal opcode used by @hocuspocus/extension-redis to
				// fan a stateless payload across server instances. The Redis path
				// invokes MessageReceiver without a `connection`, so a defined
				// `connection` here means this frame came from a WebSocket client
				// — which is never legitimate. Clients must use MessageType.Stateless
				// (opcode 5); the onStateless hook is the authorization point and
				// may call Document.broadcastStateless() to fan out if appropriate.
				if (connection) {
					throw new Error(
						"BroadcastStateless is a server-internal opcode and cannot be sent from a client",
					);
				}
				const msg = message.readVarString();
				// `relayStateless`, not `broadcastStateless`: the originating
				// instance already ran the beforeBroadcastStateless hook. It shares
				// one encoded buffer across connections instead of encoding per
				// connection, which matters here because this path fans out on
				// every instance of a cluster.
				document.relayStateless(msg);
				break;
			}

			case MessageType.CLOSE: {
				connection?.close({
					code: 1000,
					reason: "provider_initiated",
				});
				break;
			}

			case MessageType.Auth: {
				const authType = message.readVarUint();
				if (authType === AuthMessageType.Token) {
					connection?.callbacks.onTokenSyncCallback({
						token: message.readVarString(),
					});
					break;
				}
				console.error(
					"Received an authentication message on a connection that is already fully authenticated. Probably your provider has been destroyed + recreated really fast.",
				);
				break;
			}

			default:
				console.error(
					`Unable to handle message of type ${type}: no handler defined! Are your provider/server versions aligned?`,
				);
			// Do nothing
		}
	}

	async readSyncMessage(
		message: IncomingMessage,
		document: Document,
		connection?: Connection,
		reply?: (message: Uint8Array) => void,
		requestFirstSync = true,
	) {
		const type = message.readVarUint();
		const messageAddress = connection?.messageAddress ?? document.name;

		if (connection) {
			await connection.callbacks.beforeSync(connection, {
				type,
				payload: message.peekVarUint8Array(),
			});
		}

		switch (type) {
			case messageYjsSyncStep1: {
				readSyncStep1(message.decoder, message.encoder, document);

				// When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1.
				if (reply && requestFirstSync) {
					const syncMessage = new OutgoingMessage(messageAddress)
						.createSyncReplyMessage()
						.writeFirstSyncStepFor(document);

					reply(syncMessage.toUint8Array());
				} else if (connection) {
					const syncMessage = new OutgoingMessage(messageAddress)
						.createSyncMessage()
						.writeFirstSyncStepFor(document);

					connection.send(syncMessage.toUint8Array());
				}
				break;
			}
			case messageYjsSyncStep2: {
				if (connection?.readOnly) {
					// We're in read-only mode, so we can't apply the update.
					// Let's use snapshotContainsUpdate to see if the update actually contains changes.
					// If not, we can still ack the update
					const snapshot = Y.snapshot(document);
					const update = decoding.readVarUint8Array(message.decoder);
					if (Y.snapshotContainsUpdate(snapshot, update)) {
						// no new changes in update
						const ackMessage = new OutgoingMessage(
							messageAddress,
						).writeSyncStatus(true);

						connection.send(ackMessage.toUint8Array());
					} else {
						// new changes in update that we can't apply, because readOnly
						const ackMessage = new OutgoingMessage(
							messageAddress,
						).writeSyncStatus(false);

						connection.send(ackMessage.toUint8Array());
					}
					break;
				}

				readSyncStep2(
					message.decoder,
					document,
					connection
						? { source: "connection" as const, connection }
						: (this.defaultTransactionOrigin ?? { source: "local" as const }),
				);

				if (connection) {
					connection.send(
						new OutgoingMessage(messageAddress)
							.writeSyncStatus(true)
							.toUint8Array(),
					);
				}
				break;
			}
			case messageYjsUpdate: {
				if (connection?.readOnly) {
					connection.send(
						new OutgoingMessage(messageAddress)
							.writeSyncStatus(false)
							.toUint8Array(),
					);
					break;
				}

				readUpdate(
					message.decoder,
					document,
					connection
						? { source: "connection" as const, connection }
						: (this.defaultTransactionOrigin ?? { source: "local" as const }),
				);
				if (connection) {
					connection.send(
						new OutgoingMessage(messageAddress)
							.writeSyncStatus(true)
							.toUint8Array(),
					);
				}
				break;
			}
			default:
				throw new Error(`Received a message with an unknown type: ${type}`);
		}

		return type;
	}

	applyQueryAwarenessMessage(
		document: Document,
		connection?: Connection,
		reply?: (message: Uint8Array) => void,
	) {
		const message = new OutgoingMessage(
			connection?.messageAddress ?? document.name,
		).createAwarenessUpdateMessage(document.awareness);

		if (reply) {
			reply(message.toUint8Array());
		}
	}
}
