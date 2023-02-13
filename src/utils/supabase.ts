/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { Stroke } from '../Together/types'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_KEY!)

const TABLE_NAME = import.meta.env.PROD ? 'together-prod' : 'together-dev'

export type ShapeRow = {
  room?: string
  max_y: number
  min_y: number
  stroke: Stroke
}

export async function upsertStrokes(strokes: Stroke[]) {
  const { error } = await supabase.from(TABLE_NAME).upsert<ShapeRow>(
    strokes.map((stroke) => ({
      max_y: +stroke.bbox.maxY.toFixed(),
      min_y: +stroke.bbox.minY.toFixed(),
      stroke,
    }))
  )

  return error
}
