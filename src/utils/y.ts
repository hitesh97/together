/*
The main shared yjs data structures for the app (the doc, lines, and services).
*/

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// if the process is in development, use "DEVELOPMENT_${version}"
const VERSION =
	(process.env.NODE_ENV === 'development' ? 'DEVELOPMENT_' : '') + 4

// Create the doc
export const doc = new Y.Doc()

// Create a websocket provider (but don't connect just yet)
export const provider = new WebsocketProvider(
	'wss://https://yjswebsocket-lzdg--1234.local-credentialless.webcontainer.io',
	`together-${VERSION}`,
	doc,
	{
		connect: false,
	}
)

// Export the provider's awareness API
export const awareness = provider.awareness

// Get a shared array of our line maps
export const yStrokes: Y.Map<Y.Map<any>> = doc.getMap(`strokes-${VERSION}`)
export const yUserCursors: Y.Map<Y.Map<any>> = doc.getMap(`cursors-${VERSION}`)

// Create an undo manager for the line maps
// export const undoManager = new Y.UndoManager(yStrokes)
