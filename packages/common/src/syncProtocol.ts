/**
 * Version-aware Yjs sync protocol.
 *
 * Wraps y-protocols/sync and Yjs encoding functions to support multiple
 * encoding versions (v1, v2, and future versions).
 *
 * Version 1: Standard Yjs v1 encoding (Y.encodeStateAsUpdate, Y.applyUpdate, etc.)
 * Version 2: Yjs v2 encoding (Y.encodeStateAsUpdateV2, Y.applyUpdateV2, etc.)
 */

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as Y from "yjs";

/**
 * The Yjs encoding version used for sync and storage.
 * A plain number to allow future versions (e.g. 3) without type changes.
 */
export type YjsEncodingVersion = number;

/**
 * Encode the full document state as an update, optionally diffed against an
 * encoded state vector.
 */
export function encodeStateAsUpdate(
	doc: Y.Doc,
	encodedStateVector?: Uint8Array,
	version: YjsEncodingVersion = 1,
): Uint8Array {
	if (version >= 2) {
		return Y.encodeStateAsUpdateV2(doc, encodedStateVector);
	}
	return Y.encodeStateAsUpdate(doc, encodedStateVector);
}

/**
 * Apply an update to a document.
 */
export function applyUpdate(
	doc: Y.Doc,
	update: Uint8Array,
	transactionOrigin?: unknown,
	version: YjsEncodingVersion = 1,
): void {
	if (version >= 2) {
		Y.applyUpdateV2(doc, update, transactionOrigin);
	} else {
		Y.applyUpdate(doc, update, transactionOrigin);
	}
}

/**
 * Convert an update from one encoding version to another.
 * Returns the update unchanged if fromVersion === toVersion.
 */
export function convertUpdate(
	update: Uint8Array,
	fromVersion: YjsEncodingVersion,
	toVersion: YjsEncodingVersion,
): Uint8Array {
	if (fromVersion === toVersion) {
		return update;
	}
	if (fromVersion === 1 && toVersion >= 2) {
		return Y.convertUpdateFormatV1ToV2(update);
	}
	if (fromVersion >= 2 && toVersion === 1) {
		return Y.convertUpdateFormatV2ToV1(update);
	}
	return update;
}

// y-protocols/sync sub-message type constants (re-exported for convenience)
export const messageYjsSyncStep1 = 0;
export const messageYjsSyncStep2 = 1;
export const messageYjsUpdate = 2;

/**
 * Write a SyncStep1 message: encodes the state vector so the remote can
 * compute which updates to send back.
 *
 * State vectors have the same format regardless of encoding version.
 */
export function writeSyncStep1(encoder: encoding.Encoder, doc: Y.Doc): void {
	encoding.writeVarUint(encoder, messageYjsSyncStep1);
	encoding.writeVarUint8Array(encoder, Y.encodeStateVector(doc));
}

/**
 * Write a SyncStep2 message: encodes the document state as an update (diff
 * against the given state vector) using the specified encoding version.
 */
export function writeSyncStep2(
	encoder: encoding.Encoder,
	doc: Y.Doc,
	encodedStateVector?: Uint8Array,
	version: YjsEncodingVersion = 1,
): void {
	encoding.writeVarUint(encoder, messageYjsSyncStep2);
	encoding.writeVarUint8Array(
		encoder,
		encodeStateAsUpdate(doc, encodedStateVector, version),
	);
}

/**
 * Write an update message.
 * The update must already be in the correct encoding version.
 */
export function writeUpdate(
	encoder: encoding.Encoder,
	update: Uint8Array,
): void {
	encoding.writeVarUint(encoder, messageYjsUpdate);
	encoding.writeVarUint8Array(encoder, update);
}

/**
 * Read a SyncStep1 message and write the SyncStep2 reply into the encoder.
 */
export function readSyncStep1(
	decoder: decoding.Decoder,
	encoder: encoding.Encoder,
	doc: Y.Doc,
	version: YjsEncodingVersion = 1,
): void {
	const encodedStateVector = decoding.readVarUint8Array(decoder);
	writeSyncStep2(encoder, doc, encodedStateVector, version);
}

/**
 * Read a SyncStep2 or Update message and apply it to the document.
 */
export function readSyncStep2(
	decoder: decoding.Decoder,
	doc: Y.Doc,
	transactionOrigin: unknown,
	version: YjsEncodingVersion = 1,
): void {
	try {
		const update = decoding.readVarUint8Array(decoder);
		applyUpdate(doc, update, transactionOrigin, version);
	} catch (error) {
		console.error("Caught error while handling a Yjs update", error);
	}
}

/** Alias for readSyncStep2 (updates use the same format). */
export const readUpdate = readSyncStep2;

/**
 * Read a sync sub-message and dispatch to the appropriate handler.
 * Returns the sub-message type.
 */
export function readSyncMessage(
	decoder: decoding.Decoder,
	encoder: encoding.Encoder,
	doc: Y.Doc,
	transactionOrigin: unknown,
	version: YjsEncodingVersion = 1,
): number {
	const messageType = decoding.readVarUint(decoder);
	switch (messageType) {
		case messageYjsSyncStep1:
			readSyncStep1(decoder, encoder, doc, version);
			break;
		case messageYjsSyncStep2:
			readSyncStep2(decoder, doc, transactionOrigin, version);
			break;
		case messageYjsUpdate:
			readUpdate(decoder, doc, transactionOrigin, version);
			break;
		default:
			throw new Error(`Unknown sync message type: ${messageType}`);
	}
	return messageType;
}
