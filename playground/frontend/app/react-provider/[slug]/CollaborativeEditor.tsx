"use client";

import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import * as Y from "yjs";

const initialContent = [
	1, 3, 223, 175, 255, 141, 2, 0, 7, 1, 7, 100, 101, 102, 97, 117, 108, 116, 3,
	9, 112, 97, 114, 97, 103, 114, 97, 112, 104, 7, 0, 223, 175, 255, 141, 2, 0,
	6, 4, 0, 223, 175, 255, 141, 2, 1, 17, 72, 101, 108, 108, 111, 32, 87, 111,
	114, 108, 100, 33, 32, 240, 159, 140, 142, 0,
];

const CollaborativeEditor = () => {
	const provider = useHocuspocusProvider();
	const initializedRef = useRef(false);

	useEffect(() => {
		if (!initializedRef.current) {
			Y.applyUpdate(provider.document, Uint8Array.from(initialContent));
			initializedRef.current = true;
		}
	}, [provider.document]);

	const editor = useEditor(
		{
			extensions: [
				StarterKit.configure({
					undoRedo: false,
				}),
				Collaboration.configure({
					document: provider.document,
				}),
				CollaborationCaret.configure({
					provider,
				}),
			],
			immediatelyRender: false,
			editorProps: {
				attributes: {
					class:
						"prose prose-lg max-w-none focus:outline-none min-h-[500px] p-8 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",
				},
			},
		},
		[provider.document],
	);

	return <EditorContent editor={editor} />;
};

export default CollaborativeEditor;
