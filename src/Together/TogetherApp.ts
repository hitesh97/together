import getStroke from 'perfect-freehand'
import { BBox, Stroke } from './types'
import { DPR } from './constants'
import { nanoid } from 'nanoid'
import { EventEmitter } from 'eventemitter3'

const date = new Date()
date.setUTCHours(0, 0, 0, 0)

const canvases = new WeakMap<Stroke, HTMLCanvasElement>()

export class TogetherApp extends EventEmitter {
	private parent: HTMLElement | null = null
	private canvas = document.createElement('canvas')
	private now: number
	private raf: any
	private speed = 2
	private startTime = date.getTime()

	private currentStrokeId: string | null = null
	private strokes = new Map<string, Stroke>()
	private bakedStrokes = new Map<string, Stroke>()
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
		const elapsed = now - this.now

		const doPut = elapsed > 16

		const offset = this.getYOffsetFromTime(this.now)

		if (this.state === 'pointing' && this.currentStrokeId) {
			const stroke = this.strokes.get(this.currentStrokeId)
			if (!stroke) return

			const { pointer } = this

			stroke.points.push([pointer.x, pointer.y + offset, pointer.p])

			if (doPut) {
				this.putStroke(stroke, false)
			}

			// When we see a looooong stroke, stop and start a new one
			if (stroke.points.length > 1000) {
				this.completeStroke()
				this.beginStroke()
			}
		}

		if (doPut) {
			// Cull shapes that are offscreen
			this.bakedStrokes.forEach((bakedStroke) => {
				if (bakedStroke.bbox.maxY - offset < 0) {
					this.emit('deleted-stroke', bakedStroke.id)

					// For Safari
					const canvas = canvases.get(bakedStroke)
					if (canvas) {
						canvas.width = 0
						canvas.height = 0
					}

					this.bakedStrokes.delete(bakedStroke.id)
				}
			})

			this.now = now
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
			// Pull from strokes
			if (this.strokes.has(stroke.id)) {
				this.strokes.delete(stroke.id)
			}

			// Only add the bake stroke if it's on screen
			const bbox = this.getBoundingBoxFromStroke(stroke)
			if (bbox.maxY - this.getYOffsetFromTime(this.now) > 0) {
				this.bakedStrokes.set(stroke.id, stroke)
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

		this.beginStroke()
	}

	/**
	 * Handle a pointer move event.
	 *
	 * @public
	 */
	onPointerMove: React.PointerEventHandler = (e) => {
		// if (this.state === 'pointing' && e.pointerId !== this.pointingId) return

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
		// if (this.state === 'pointing' && e.pointerId !== this.pointingId) return

		const { pointer } = this
		pointer.x = e.clientX * DPR
		pointer.y = e.clientY * DPR
		pointer.p = e.pressure ?? 0.5

		e.currentTarget.releasePointerCapture(e.pointerId)

		this.completeStroke()
	}

	private beginStroke() {
		const { pointer } = this

		this.state = 'pointing'

		this.currentStrokeId = nanoid()

		const time = Date.now()

		this.putStroke(
			{
				id: this.currentStrokeId,
				createdAt: time - this.startTime,
				tool: this.tool,
				size: this.size,
				color: this.color,
				points: [
					[
						pointer.x,
						pointer.y + this.getYOffsetFromTime(Date.now()),
						pointer.p,
					],
				],
				done: false,
				bbox: {
					minX: pointer.x,
					minY: pointer.y,
					maxX: pointer.x + 1,
					maxY: pointer.y + 1000,
				},
			},
			false
		)
	}

	private completeStroke() {
		const { currentStrokeId } = this

		if (this.state === 'pointing' && currentStrokeId) {
			// Complete the current stroke
			const stroke = this.strokes.get(currentStrokeId)
			if (!stroke) return
			stroke.done = true
			stroke.bbox = this.getBoundingBoxFromStroke(stroke)
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
			simulatePressure:
				(points[0][2] === 0.0 || points[0][2] === 0.5) &&
				(points[1] ? points[1]?.[2] === 0.0 || points[1]?.[2] === 0.5 : true),
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
		const strokesToStamp = Array.from(bakedStrokes.values()).sort(
			(a, b) => a.createdAt - b.createdAt
		)

		strokesToStamp.forEach((bakedStroke) => {
			ctx.globalCompositeOperation =
				bakedStroke.tool === 'eraser' ? 'destination-out' : 'source-over'
			const canvas = this.getCanvasForStroke(bakedStroke)
			if (canvas) {
				ctx.drawImage(canvas, bakedStroke.bbox.minX, bakedStroke.bbox.minY)
			}
		})

		// Now paint the rendering strokes
		const strokesToRender = Array.from(strokes.values()).sort(
			(a, b) => a.createdAt - b.createdAt
		)

		strokesToRender.forEach((stroke) => {
			ctx.globalCompositeOperation =
				stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
			this.paintStrokeToCanvas({ ctx, stroke })
		})
	}

	private getCanvasForStroke(stroke: Stroke) {
		if (canvases.has(stroke)) {
			return canvases.get(stroke)
		}

		const { bbox } = stroke

		const cvs = document.createElement('canvas') as HTMLCanvasElement
		cvs.width = bbox.maxX - bbox.minX
		cvs.height = bbox.maxY - bbox.minY

		const ctx = cvs.getContext('2d')

		if (!ctx) {
			console.error('Could not get context')
			return null
		}

		ctx.translate(-bbox.minX, -bbox.minY)

		this.paintStrokeToCanvas({ ctx, stroke })

		canvases.set(stroke, cvs)

		return cvs
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
		return (time - this.startTime) / (50 / this.speed)
	}
}
