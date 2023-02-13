import type { PartyKitServer } from 'partykit/server'
import { onConnect } from 'y-partykit'

export default {
  onConnect(ws, room) {
    // Connect to the room
    onConnect(ws, room, {
      gc: true,
    })
  },
} satisfies PartyKitServer
