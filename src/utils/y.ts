import * as Y from 'yjs'
import YProvider from 'y-partykit/provider'

// if the process is in development, use "DEVELOPMENT_${version}"
const VERSION = (process.env.NODE_ENV === 'development' ? 'd' : '') + 5
const RANDOM_ROOM = Math.floor(Math.random() * 2)

// Create the doc
export const doc = new Y.Doc()

// Create a websocket provider (but don't connect just yet)
export const provider = new YProvider(
  'tldraw-together.threepointone.partykit.dev',
  // "localhost:1999",
  `together-${VERSION}${RANDOM_ROOM > 0 ? `-${RANDOM_ROOM}` : ''}`,
  doc,
  {
    connect: false,
  }
)

// Export the provider's awareness API
export const awareness = provider.awareness

// Get a shared array of our line maps
export const yStrokes: Y.Map<Y.Map<any>> = doc.getMap(`strokes-${VERSION}`)
export const yUsers: Y.Array<string> = doc.getArray(`users-${VERSION}`)
