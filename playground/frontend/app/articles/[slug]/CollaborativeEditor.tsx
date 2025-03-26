"use client";

import type { HocuspocusProvider } from "@hocuspocus/provider";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCursor } from "@tiptap/extension-collaboration-cursor";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import * as Y from "yjs";

const initialContent = [
	1, 3, 223, 175, 255, 141, 2, 0, 7, 1, 7, 100, 101, 102, 97, 117, 108, 116, 3,
	9, 112, 97, 114, 97, 103, 114, 97, 112, 104, 7, 0, 223, 175, 255, 141, 2, 0,
	6, 4, 0, 223, 175, 255, 141, 2, 1, 17, 72, 101, 108, 108, 111, 32, 87, 111,
	114, 108, 100, 33, 32, 240, 159, 140, 142, 0,
];

const CollaborativeEditor = (props: {
	slug: string;
	provider: HocuspocusProvider;
}) => {
	/**
	 * if you want to load initial content to the editor, the safest way to do so is by applying an initial Yjs update.
	 * Yjs updates can safely be applied multiple times, while using `setContent` or similar Tiptap commands may result in
	 * duplicate content in the Tiptap editor.
	 *
	 * The easiest way to generate the Yjs update (`initialContent` above) is to do something like
	 *
	 * ```
	 * console.log(Y.encodeStateAsUpdate(provider.props.document).toString())
	 * ```
	 *
	 * after you have filled the editor with the desired content.
	 */
	Y.applyUpdate(props.provider.document, Uint8Array.from(initialContent));

	const editor = useEditor(
		{
			extensions: [
				// make sure to turn off the history extension when using collaboration
				StarterKit.configure({
					history: false,
				}),
				Collaboration.configure({
					document: props.provider.document,
				}),
				CollaborationCursor.configure({
					provider: props.provider,
				}),
			],
			// immediatelyRender needs to be `false` when using SSR
			immediatelyRender: false,
			editorProps: {
				attributes: {
					class:
						"prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none border border-gray p-3",
				},
			},
		},
		[props.provider.document],
	);

	return <EditorContent editor={editor} />;
};

export default CollaborativeEditor;
