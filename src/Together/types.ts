export type Point = number[]

export type BBox = { minX: number; minY: number; maxX: number; maxY: number }

export enum UserType {
  'user',
  'admin',
}

export type Stroke = {
  id: string
  createdAt: number
  tool: 'ink' | 'eraser' | 'highlighter'
  size: number
  color: string
  points: Point[]
  done: boolean
  bbox: BBox
  pen: boolean
  type: UserType
}

export type UserCursor = {
  id: string
  name: string
  color: string
  icon: string
  x: number
  y: number
  lastChanged: number
}
