export type Point = number[]

export type BBox = { minX: number; minY: number; maxX: number; maxY: number }

export type Stroke = {
	id: string
	createdAt: number
	tool: 'ink' | 'eraser'
	size: number
	color: string
	points: Point[]
	done: boolean
}

export type BakedStroke = Omit<Stroke, 'points'> & {
	canvas: HTMLCanvasElement
	bbox: BBox
}
