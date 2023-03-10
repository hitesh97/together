import * as Y from 'yjs'
import YProvider from 'y-partykit/provider'

// if the process is in development, use "DEVELOPMENT_${version}"
const VERSION = (import.meta.env.PROD ? '' : 'd') + 6

// Create the doc
export const doc = new Y.Doc()

// Create a websocket provider (but don't connect just yet)
export const provider = new YProvider('tldraw-together.threepointone.partykit.dev', `together-${VERSION}`, doc, {
  connect: false,
})

// Export the provider's awareness API
export const awareness = provider.awareness

// Get a shared array of our line maps
export const yStrokes: Y.Map<Y.Map<any>> = doc.getMap(`strokes-${VERSION}`)
