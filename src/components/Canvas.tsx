import getStroke from 'perfect-freehand'
import { useEffect, useRef } from 'react'

const DPR = window.devicePixelRatio ?? 1

class Game {
	canvas = document.createElement('canvas')

	bakedStrokes: {
		bbox: {
			minX: number
			minY: number
			maxX: number
			maxY: number
		}
		canvas: HTMLCanvasElement
	}[] = []

	strokes: number[][][] = []
	points: number[][] | null = null

	now: number
	raf: any
	duration = 0
	elapsed = 0
	speed = 2

	constructor() {
		this.now = Date.now()

		this.raf = requestAnimationFrame(this.tick)
	}

	mount = (parent: HTMLElement) => {
		const rect = parent.getBoundingClientRect()
		this.canvas.width = rect.width * DPR
		this.canvas.height = rect.height * DPR
		this.canvas.style.transform = `scale(${1 / DPR}, ${1 / DPR})`

		parent.appendChild(this.canvas)
	}

	tick = () => {
		const now = Date.now()
		this.elapsed = now - this.now
		this.duration += this.elapsed
		this.now = now

		// Cull shapes that are offscreen
		const { offset } = this
		this.bakedStrokes = this.bakedStrokes.filter((bakedStroke) => {
			return bakedStroke.bbox.maxY - offset > 0
		})

		if (this.state === 'pointing' && this.points) {
			const { pointer } = this
			this.points.push([pointer.x, pointer.y + offset, pointer.p])
		}

		this.paintCanvas()

		requestAnimationFrame(this.tick)
	}

	dispose = () => {
		cancelAnimationFrame(this.raf)
	}

	state = 'idle' as 'idle' | 'pointing'
	pointer = { x: 0, y: 0, p: 0.5 }
	pointingId = -1

	get offset() {
		return this.duration / (100 / this.speed)
	}

	onPointerDown: React.PointerEventHandler = (e) => {
		const { pointer } = this
		pointer.x = e.clientX * DPR
		pointer.y = e.clientY * DPR
		pointer.p = e.pressure ?? 0.5

		e.currentTarget.setPointerCapture(e.pointerId)

		this.state = 'pointing'
		this.points = [[pointer.x, pointer.y + this.offset, pointer.p]]
	}

	onPointerMove: React.PointerEventHandler = (e) => {
		const { pointer } = this
		pointer.x = e.clientX * DPR
		pointer.y = e.clientY * DPR
		pointer.p = e.pressure ?? 0.5
	}

	onPointerUp: React.PointerEventHandler = (e) => {
		if (this.state === 'pointing' && this.points) {
			const bbox = this.getBoundingBox(this.points)

			const cvs = document.createElement('canvas') as HTMLCanvasElement

			cvs.width = bbox.maxX - bbox.minX
			cvs.height = bbox.maxY - bbox.minY

			const ctx = cvs.getContext('2d')!
			ctx.translate(-bbox.minX, -bbox.minY)

			this.paintStroke(ctx, this.points, true)

			this.bakedStrokes.push({
				bbox,
				canvas: cvs,
			})
		}

		this.state = 'idle'
		this.points = null
	}

	paintStroke(
		ctx: CanvasRenderingContext2D,
		points: number[][],
		done: boolean
	) {
		const stroke = getStroke(points, {
			size: 10 * DPR,
			last: done,
			thinning: 0.65,
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
		ctx.fillStyle = '#000'
		ctx.fill()
	}

	paintCanvas() {
		const cvs = this.canvas
		const ctx = cvs.getContext('2d')

		if (!ctx) return

		ctx.resetTransform()
		ctx.clearRect(0, 0, cvs.width, cvs.height)
		ctx.translate(0, -this.offset)

		for (const bakedStroke of this.bakedStrokes) {
			ctx.drawImage(
				bakedStroke.canvas,
				bakedStroke.bbox.minX,
				bakedStroke.bbox.minY
			)
		}

		if (this.points?.length) {
			this.paintStroke(ctx, this.points, false)
		}
	}

	getBoundingBox(points: number[][]) {
		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity

		for (let i = 0; i < points.length; i++) {
			const [x, y] = points[i]
			minX = Math.min(minX, x)
			minY = Math.min(minY, y)
			maxX = Math.max(maxX, x)
			maxY = Math.max(maxY, y)
		}

		minX -= 32
		minY -= 32
		maxX += 32
		maxY += 32

		return { minX, minY, maxX, maxY }
	}
}

const game = new Game()

export function Canvas() {
	const rCanvasContainer = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const container = rCanvasContainer.current
		if (!container) return

		game.mount(container)

		return () => {}
	}, [])

	return (
		<div
			className="canvas-container"
			ref={rCanvasContainer}
			onPointerMove={game.onPointerMove}
			onPointerDown={game.onPointerDown}
			onPointerUp={game.onPointerUp}
		/>
	)
}
