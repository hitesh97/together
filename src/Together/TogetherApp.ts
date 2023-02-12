import getStroke from 'perfect-freehand'
import { BakedStroke, BBox, Point, Stroke } from './types'
import { DPR } from './constants'
import { nanoid } from 'nanoid'
import { EventEmitter } from 'eventemitter3'

const date = new Date()
date.setUTCHours(0, 0, 0, 0)

export class TogetherApp extends EventEmitter {
	private parent: HTMLElement | null = null
	private canvas = document.createElement('canvas')
	private now: number
	private raf: any
	private elapsed = 0
	private duration = 0
	private speed = 2
	private startTime = date.getTime()

	private currentStrokeId: string | null = null
	private strokes = new Map<string, Stroke>()
	private bakedStrokes = new Map<string, BakedStroke>()
	private state = 'idle' as 'idle' | 'pointing'
	private pointer = { x: 0, y: 0, p: 0.5 }
	private pointingId = -1

	// Styles
	color = '#333'
	tool: 'ink' | 'eraser' = 'ink'
	size = 10

	constructor() {
		super()
		this.now = Date.now()
		this.canvas.className = 'canvas'
	}

	private tick = () => {
		const now = Date.now()
		this.elapsed = now - this.now
		if (this.elapsed < 16) {
			this.raf = requestAnimationFrame(this.tick)
			return
		}

		this.duration += this.elapsed
		this.elapsed = 0
		this.now = now

		// Cull shapes that are offscreen

		this.bakedStrokes.forEach((bakedStroke) => {
			if (
				bakedStroke.bbox.maxY - this.getYOffsetFromTime(bakedStroke.createdAt) <
				0
			) {
				this.emit('deleted-stroke', bakedStroke.id)
				this.bakedStrokes.delete(bakedStroke.id)
			}
		})

		if (this.state === 'pointing' && this.currentStrokeId) {
			const stroke = this.strokes.get(this.currentStrokeId)
			if (!stroke) return

			const { pointer } = this
			stroke.points.push([
				pointer.x,
				pointer.y + this.getYOffsetFromTime(Date.now()),
				pointer.p,
			])
			this.putStroke(stroke, false)
		}

		this.paintCanvas()

		requestAnimationFrame(this.tick)
	}

	/**
	 * Mount the canvas into a container.
	 *
	 * @param parent The parent element.
	 *
	 * @public
	 */
	mount = (parent: HTMLElement) => {
		this.parent = parent
		parent.appendChild(this.canvas)
		this.onResize()
	}

	/**
	 * Start the animation loop.
	 *
	 * @public
	 */
	start = () => {
		this.raf = requestAnimationFrame(this.tick)
	}

	/**
	 * Stop the animation loop.
	 *
	 * @public
	 */
	stop = () => {
		cancelAnimationFrame(this.raf)
	}

	/**
	 * Put a stroke (externally) into the canvas.
	 */
	putStroke = (stroke: Stroke, external = true) => {
		if (stroke.done) {
			// Create a baked storke
			const bakedStroke = this.getBakedStroke(stroke)
			this.bakedStrokes.set(bakedStroke.id, bakedStroke)

			// Pull from strokes
			if (this.strokes.has(stroke.id)) {
				this.strokes.delete(stroke.id)
			}
		} else {
			// Or else add it to the rendering strokes
			this.strokes.set(stroke.id, stroke)
		}

		if (!external) {
			this.emit('updated-stroke', stroke)
		}
	}

	/**
	 * Handle a resize event.
	 *
	 * @public
	 */
	onResize = () => {
		const { parent } = this
		if (!parent) return
		const rect = parent.getBoundingClientRect()
		this.canvas.width = rect.width * DPR
		this.canvas.height = rect.height * DPR
		this.canvas.style.transform = `scale(${1 / DPR}, ${1 / DPR})`
		this.paintCanvas()
	}

	/**
	 * Handle a pointer down event.
	 *
	 * @public
	 */
	onPointerDown: React.PointerEventHandler = (e) => {
		if (this.state === 'pointing') return

		const { pointer } = this
		pointer.x = e.clientX * DPR
		pointer.y = e.clientY * DPR
		pointer.p = e.pressure ?? 0.5

		this.pointingId = e.pointerId

		e.currentTarget.setPointerCapture(e.pointerId)

		this.state = 'pointing'

		// Create a new current stroke

		this.currentStrokeId = nanoid()
		const time = Date.now()

		this.putStroke({
			id: this.currentStrokeId,
			createdAt: time,
			tool: this.tool,
			size: this.size,
			color: this.color,
			points: [
				[pointer.x, pointer.y + this.getYOffsetFromTime(Date.now()), pointer.p],
			],
			done: false,
		})
	}

	/**
	 * Handle a pointer move event.
	 *
	 * @public
	 */
	onPointerMove: React.PointerEventHandler = (e) => {
		if (this.state === 'pointing' && e.pointerId !== this.pointingId) return

		const { pointer } = this
		pointer.x = e.clientX * DPR
		pointer.y = e.clientY * DPR
		pointer.p = e.pressure ?? 0.5
	}

	/**
	 * Handle a pointer up event.
	 *
	 * @public
	 */
	onPointerUp: React.PointerEventHandler = (e) => {
		if (this.state === 'pointing' && e.pointerId !== this.pointingId) return

		const { pointer } = this
		pointer.x = e.clientX * DPR
		pointer.y = e.clientY * DPR
		pointer.p = e.pressure ?? 0.5

		e.currentTarget.releasePointerCapture(e.pointerId)

		const { currentStrokeId } = this

		if (this.state === 'pointing' && currentStrokeId) {
			// Complete the current stroke
			const stroke = this.strokes.get(currentStrokeId)
			if (!stroke) return
			stroke.done = true
			this.putStroke(stroke, false)
		}

		this.state = 'idle'
		this.currentStrokeId = null
	}

	/**
	 * Render a set of input points onto a canvas.
	 *
	 * @param ctx The context to render into.
	 * @param points The points to render.
	 * @param done Whether the stroke is done or not.
	 *
	 * @private
	 */
	private paintStrokeToCanvas(opts: {
		ctx: CanvasRenderingContext2D
		stroke: Stroke
	}) {
		const {
			ctx,
			stroke: { tool, points, size, color, done },
		} = opts

		const isEraser = tool === 'eraser'

		const stroke = getStroke(points, {
			size: (isEraser ? size * 2 : size) * DPR,
			last: done,
			thinning: isEraser ? -0.65 : 0.65,
			simulatePressure: points[0][2] === 0.5 && points[1]?.[2] === 0.5,
		})

		ctx.beginPath()
		ctx.moveTo(stroke[0][0], stroke[0][1])
		for (let i = 1; i < stroke.length - 1; i++) {
			ctx.quadraticCurveTo(
				stroke[i][0],
				stroke[i][1],
				(stroke[i][0] + stroke[i + 1][0]) / 2,
				(stroke[i][1] + stroke[i + 1][1]) / 2
			)
		}
		ctx.closePath()
		ctx.fillStyle = color
		ctx.fill()
	}

	/**
	 * Paint the current frame. This is called on every animation frame.
	 * It paints the baked strokes and renders current stroke.
	 *
	 * @private
	 */
	private paintCanvas(): void {
		const cvs = this.canvas
		const ctx = cvs.getContext('2d')

		if (!ctx) return

		const { bakedStrokes, strokes } = this

		ctx.resetTransform()
		ctx.clearRect(0, 0, cvs.width, cvs.height)
		ctx.translate(0, -this.getYOffsetFromTime(Date.now()))

		// First paint the baked strokes
		Array.from(bakedStrokes.values())
			.sort((a, b) => a.createdAt - b.createdAt)
			.forEach((bakedStroke) => {
				ctx.globalCompositeOperation =
					bakedStroke.tool === 'eraser' ? 'destination-out' : 'source-over'
				ctx.drawImage(
					bakedStroke.canvas,
					bakedStroke.bbox.minX,
					bakedStroke.bbox.minY
				)
			})

		// Now paint the rendering strokes
		Array.from(strokes.values())
			.sort((a, b) => a.createdAt - b.createdAt)
			.forEach((stroke) => {
				ctx.globalCompositeOperation =
					stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
				this.paintStrokeToCanvas({ ctx, stroke })
			})
	}

	/**
	 * Bake a stroke into an image.
	 * This is called when a stroke is finished.
	 *
	 * @param stroke The stroke to bake.
	 * @returns The baked stroke.
	 * @private
	 */
	private getBakedStroke(stroke: Stroke): BakedStroke {
		const cvs = document.createElement('canvas') as HTMLCanvasElement

		const bbox = this.getBoundingBoxFromStroke(stroke)

		cvs.width = bbox.maxX - bbox.minX
		cvs.height = bbox.maxY - bbox.minY

		const ctx = cvs.getContext('2d')!
		ctx.translate(-bbox.minX, -bbox.minY)

		this.paintStrokeToCanvas({ ctx, stroke })

		return {
			...stroke,
			bbox,
			canvas: cvs,
		}
	}

	/**
	 * Get the bounding box of a set of points with some padding.
	 *
	 * @param points The points to get the bounding box of.
	 * @returns The bounding box.
	 */
	private getBoundingBoxFromStroke(stroke: Stroke): BBox {
		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity

		const { points } = stroke

		for (let i = 0; i < points.length; i++) {
			const [x, y] = points[i]
			minX = Math.min(minX, x)
			minY = Math.min(minY, y)
			maxX = Math.max(maxX, x)
			maxY = Math.max(maxY, y)
		}

		const padding = stroke.size * 2

		minX -= padding
		minY -= padding
		maxX += padding
		maxY += padding

		return { minX, minY, maxX, maxY }
	}

	private getYOffsetFromTime(time: number): number {
		return (time - this.startTime) / (80 / this.speed)
	}
}
