import { useContext } from "react";

import { HocuspocusRoomContext } from "../context.ts";

/**
 * Access the HocuspocusProvider instance for the current room.
 *
 * Must be used within a HocuspocusRoom component.
 *
 * @returns The HocuspocusProvider instance
 * @throws Error if used outside of HocuspocusRoom
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const provider = useHocuspocusProvider()
 *
 *   const editor = useEditor({
 *     extensions: [
 *       Collaboration.configure({ document: provider.document }),
 *       CollaborationCursor.configure({ provider }),
 *     ],
 *   })
 *
 *   return <EditorContent editor={editor} />
 * }
 * ```
 */
export function useHocuspocusProvider() {
	const context = useContext(HocuspocusRoomContext);

	if (!context) {
		throw new Error("useHocuspocusProvider must be used within a HocuspocusRoom");
	}

	return context.provider;
}
