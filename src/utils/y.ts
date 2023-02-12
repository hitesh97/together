/*
The main shared yjs data structures for the app (the doc, lines, and services).
*/

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Stroke } from '../Together/types'

const VERSION = 1

// Create the doc
export const doc = new Y.Doc()

// Create a websocket provider (but don't connect just yet)
export const provider = new WebsocketProvider(
	'wss://demos.yjs.dev',
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

// Create an undo manager for the line maps
// export const undoManager = new Y.UndoManager(yStrokes)
