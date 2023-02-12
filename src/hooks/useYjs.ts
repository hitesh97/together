import { useEffect, useState } from 'react'
import { TogetherApp } from '../Together/TogetherApp'
import { Stroke, UserCursor } from '../Together/types'

let ID: string

const foundId = localStorage.getItem('together_id')

if (foundId === null) {
  ID = nanoid()
  localStorage.setItem('together_id', ID)
} else {
  ID = foundId
}

import * as Y from 'yjs'
import { yStrokes, provider, yUsers } from '../utils/y'
import { nanoid } from 'nanoid'

export function useYjs(app: TogetherApp) {
  const [isSynced, setIsSynced] = useState(false)
  const [users, setUsers] = useState<number>(1)

  // Handle stroke updates
  useEffect(() => {
    const fn = (stroke: Stroke) => {
      const yStroke = new Y.Map()
      for (const key in stroke) {
        yStroke.set(key, stroke[key as keyof Stroke])
      }

      yStrokes.set(stroke.id, yStroke)
    }

    app.on('updated-stroke', fn)
    return () => {
      app.off('updated-stroke', fn)
    }
  })

  // Handle stroke deletes
  useEffect(() => {
    const fn = (id: string) => {
      yStrokes.delete(id)
    }

    app.on('deleted-stroke', fn)
    return () => {
      app.off('deleted-stroke', fn)
    }
  })

  // Subscribe to changes in the yStrokes array
  useEffect(() => {
    function handleChange(a: Y.YMapEvent<Y.Map<any>>, b: Y.Transaction) {
      a.changes.keys.forEach((_, id) => {
        const stroke = yStrokes.get(id)
        if (stroke) {
          app.putStroke(stroke.toJSON() as Stroke, true)
        }
      })
    }

    yStrokes.observe(handleChange)

    return () => {
      yStrokes.unobserve(handleChange)
    }
  }, [])

  // Subscribe to changes in the yUsers array
  useEffect(() => {
    function handleChange() {
      setUsers(yUsers.length)
    }

    yUsers.observe(handleChange)

    return () => {
      yUsers.unobserve(handleChange)
    }
  }, [])

  // Handle the provider connection. Include a listener
  // on the window to disconnect automatically when the
  // tab or window closes.
  useEffect(() => {
    function handleConnect() {
      setIsSynced(true)
      const index = yUsers.toArray().indexOf(ID)
      if (index === -1) {
        yUsers.push([ID])
      }

      setUsers(yUsers.length)

      yStrokes.forEach((yStroke) => {
        app.putStroke(yStroke.toJSON() as Stroke, true)
      })
    }

    function handleDisconnect() {
      const index = yUsers.toArray().indexOf(ID)
      if (index > -1) {
        yUsers.delete(index, 1)
      }

      provider.off('sync', handleConnect)
      provider.disconnect()
      setIsSynced(false)
    }

    window.addEventListener('beforeunload', handleDisconnect)

    provider.on('sync', handleConnect)
    provider.on('disconnect', handleDisconnect)

    provider.connect()

    return () => {
      handleDisconnect()
      window.removeEventListener('beforeunload', handleDisconnect)
    }
  }, [])

  return { isSynced, users }
}
