import { useEffect } from 'react'
import { TogetherApp } from '../Together/TogetherApp'
import { Stroke } from '../Together/types'
import { upsertStrokes } from '../utils/supabase'

const pending = {
  current: [] as Stroke[],
}

export function useSupabase(app: TogetherApp) {
  useEffect(() => {
    function handleStroke(stroke: Stroke) {
      pending.current.push(stroke)
    }

    const interval = setInterval(async () => {
      if (pending.current.length) {
        const sending = [...pending.current]
        pending.current.length = 0
        const error = await upsertStrokes(sending)
        if (error) {
          pending.current.push(...sending)
        }
      }
    }, 5000)

    app.on('create-stroke', handleStroke)

    return () => {
      clearInterval(interval)
      app.off('create-stroke', handleStroke)
    }
  })
}
