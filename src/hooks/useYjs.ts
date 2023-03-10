import { useEffect, useState } from 'react'
import { TogetherApp } from '../Together/TogetherApp'
import { Stroke } from '../Together/types'

let ID: string

const foundId = localStorage.getItem('together_id')

if (foundId === null) {
  ID = nanoid()
  localStorage.setItem('together_id', ID)
} else {
  ID = foundId
}

import * as Y from 'yjs'
import { yStrokes, provider, awareness } from '../utils/y'
import { nanoid } from 'nanoid'

export function useYjs(app: TogetherApp) {
  const [status, setStatus] = useState('connecting')
  const [users, setUsers] = useState(0)

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
  }, [])

  // Handle stroke deletes
  useEffect(() => {
    const fn = (id: string) => {
      yStrokes.delete(id)
    }

    app.on('deleted-stroke', fn)
    return () => {
      app.off('deleted-stroke', fn)
    }
  }, [])

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

  // Handle the provider connection. Include a listener
  // on the window to disconnect automatically when the
  // tab or window closes.
  useEffect(() => {
    function handleUserChange() {
      setUsers(awareness.getStates().size)
    }

    function handleConnect() {
      console.log('Connected')

      yStrokes.forEach((yStroke) => {
        app.putStroke(yStroke.toJSON() as Stroke, true)
      })

      awareness.setLocalState({ id: ID })
      awareness.on('change', handleUserChange)
      handleUserChange()

      setStatus('connected')
      resetIdleTimeout()
    }

    function handleDisconnect() {
      // only auto disconnect if there are more than 50 users
      if (awareness.getStates().size < 50) {
        resetIdleTimeout()
        return
      }

      clearTimeout(timeout)
      provider.off('sync', handleConnect)
      provider.disconnect()

      console.log('Disconnected')
      setStatus('disconnected')
    }

    let timeout: any = -1
    function resetIdleTimeout() {
      if (timeout !== -1) {
        clearTimeout(timeout)
      }

      // If you haven't interacted with the page in 30 seconds, disconnect
      timeout = setTimeout(handleDisconnect, 30 * 1000)
    }

    app.on('updated-stroke', resetIdleTimeout)

    window.addEventListener('beforeunload', handleDisconnect)

    provider.on('sync', handleConnect)
    provider.on('disconnect', handleDisconnect)

    provider.connect()

    return () => {
      handleDisconnect()
      app.off('updated-stroke', resetIdleTimeout)
      window.removeEventListener('beforeunload', handleDisconnect)
    }
  }, [])

  return { status, users }
}
