import getStroke from 'perfect-freehand'
import { BBox, Stroke, UserType } from './types'
import { COLORS, DPR, PEN_EASING, SIZES, TOOLS } from './constants'
import { nanoid } from 'nanoid'
import { EventEmitter } from 'eventemitter3'

const adminPw = new URL(window.location.href)?.searchParams?.get('p')
const isAdmin = adminPw !== null && adminPw === import.meta.env.VITE_ADMIN_PASSWORD
const userType = isAdmin ? UserType.admin : UserType.user

const date = new Date()
date.setUTCHours(0, 0, 0, 0)

const canvases = new WeakMap<Stroke, HTMLCanvasElement>()

export class TogetherApp extends EventEmitter {
  /**
   * The parent element that the canvas is mounted into. We use this
   * to calculate the canvas size. It's set in the `mount` method.
   *
   * @private
   */
  private parent: HTMLElement | null = null

  /**
   * The canvas element used to render the strokes. This is created
   * within the app but can be mounted into the DOM using the `mount`
   * method.
   *
   * @private
   */
  private canvas = document.createElement('canvas')

  /**
   * The current animation frame request.
   *
   * @private
   */
  private raf: any

  /**
   * The speed of the canvas offset, relative to 1 pixel every 16ms.
   *
   * @private
   */
  private speed = 0.1

  /**
   * The start time of the app. This is used to calculate the Y offset of the
   * strokes. This should never change.
   *
   * @private
   * @readonly
   */
  private readonly startTime = date.getTime()

  /**
   * The current time.
   *
   * @private
   */
  private now: number

  /**
   * When pointing, this is the stroke ID that we're currently drawing.
   *
   * @private
   */
  private currentStrokeId: string | null = null

  /**
   * You only get to erase for this many frames.
   *
   * @private
   */
  private eraserFrames = 400

  /**
   * This is the map of strokes that we have in the app. Some may be done
   * and some may be in progress. This is edited both "internally" and
   * "externally", e.g. from a sync service.
   *
   * @private
   */
  private strokes = new Map<string, Stroke>()

  readonly id = nanoid()

  /**
   * The current state of the app.
   *
   * @private
   */
  private state = 'idle' as 'idle' | 'pointing'

  /**
   * The current pointer position in screen space.
   *
   * @private
   */
  private pointer = { x: 0, y: 0, p: 0.5 }

  /**
   * Whether we're in pen mode or not. When in pen mode, ignore non-pen events.
   *
   * @private
   */
  private isPenMode = false

  /**
   * The current pointer ID that we're using. This is tricky, should be used to avoid multi-touch.
   *
   * @private
   */
  private pointingId = -1

  // Styles
  private tool: typeof TOOLS[number] = TOOLS[0]
  private inkColor: typeof COLORS[number] = COLORS[0]
  private inkSize: typeof SIZES[number] = SIZES[1]
  private highlighterColor: typeof COLORS[number] = COLORS[5]
  private highlighterSize: typeof SIZES[number] = SIZES[2]
  private eraserSize: typeof SIZES[number] = SIZES[2]

  constructor() {
    super()
    this.now = Date.now()
    this.canvas.className = 'canvas'
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

  setInkColor = (color: typeof COLORS[number]) => {
    this.inkColor = color
  }

  setHighlighterColor = (color: typeof COLORS[number]) => {
    this.highlighterColor = color
  }

  setTool = (tool: typeof TOOLS[number]) => {
    this.tool = tool
  }

  setInkSize = (size: typeof SIZES[number]) => {
    this.inkSize = size
  }

  setEraserSize = (size: typeof SIZES[number]) => {
    this.eraserSize = size
  }

  setHighlighterSize = (size: typeof SIZES[number]) => {
    this.highlighterSize = size
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
   * Put a stroke into the canvas.
   *
   * @param stroke The stroke to put.
   * @param external Whether the stroke is external or not. If it's external, it will not emit an event.
   *
   * @public
   */
  putStroke = (stroke: Stroke, external = true) => {
    if (stroke.done) {
      // Pull from strokes
      if (this.strokes.has(stroke.id)) {
        this.strokes.delete(stroke.id)
      }

      // Only add the bake stroke if it's on screen
      const offset = this.getCurrentYOffsetForStroke(stroke)
      if (stroke.done && stroke.bbox.maxY - offset > 0) {
        this.strokes.set(stroke.id, stroke)
      } else {
        // stroke is off screen
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

    // we'll render on the next frame
  }

  /**
   * Handle a pointer down event.
   *
   * @public
   */
  onPointerDown: React.PointerEventHandler = (e) => {
    if (this.state === 'pointing') return

    const isPen = this.isPenEvent(e)

    if (isPen) {
      // Only set pen mode from off to on
      this.isPenMode = true
    } else {
      // If we're in pen mode, ignore non-pen events
      if (this.isPenMode) {
        return
      }
    }

    const { pointer } = this
    pointer.x = e.clientX * DPR
    pointer.y = e.clientY * DPR
    pointer.p = this.isPenMode ? Math.max(0.1, e.pressure) : 0.25

    this.pointingId = e.pointerId

    e.currentTarget.setPointerCapture(e.pointerId)

    if (this.tool === 'eraser' && this.eraserFrames < 240) {
      return
    }

    this.state = 'pointing'
    this.beginStroke()
  }

  /**
   * Handle a pointer move event.
   *
   * @public
   */
  onPointerMove: React.PointerEventHandler = (e) => {
    const { pointer } = this
    pointer.x = e.clientX * DPR
    pointer.y = e.clientY * DPR
    pointer.p = e.pressure ?? 0.5

    const isPen = this.isPenEvent(e)

    if (this.state === 'pointing' && !this.isPenMode) {
      if (isPen) {
        // If we switched from a non-pen to a pen, then
        // clear the current stroke's points and start over.
        const { currentStrokeId, strokes } = this
        if (currentStrokeId) {
          const stroke = strokes.get(currentStrokeId)
          if (stroke) {
            const { pointer } = this
            const offset = this.getCurrentYOffsetForStroke(stroke)
            stroke.points = [[pointer.x, pointer.y + -offset, pointer.p]]
          }
        }

        // Only set pen mode from off to on
        this.isPenMode = true
      }
    }
  }

  /**
   * Handle a pointer up event.
   *
   * @public
   */
  onPointerUp: React.PointerEventHandler = (e) => {
    const { pointer } = this
    pointer.x = e.clientX * DPR
    pointer.y = e.clientY * DPR
    pointer.p = e.pressure ?? 0.5

    e.currentTarget.releasePointerCapture(e.pointerId)

    // If we have a current stroke, complete it.
    const { currentStrokeId } = this
    if (this.state === 'pointing' && currentStrokeId) {
      const stroke = this.strokes.get(currentStrokeId)
      if (!stroke) return
      this.completeStroke(stroke)
    }

    this.state = 'idle'
    this.currentStrokeId = null
  }

  /**
   * Begin a stroke.
   *
   * @private
   */
  private beginStroke() {
    const { pointer } = this

    this.currentStrokeId = nanoid()
    const time = this.now

    this.putStroke(
      {
        id: this.currentStrokeId,
        createdAt: time,
        tool: this.tool,
        size:
          this.tool === 'ink'
            ? this.inkSize
            : this.tool === 'eraser'
            ? this.eraserSize
            : this.tool === 'highlighter'
            ? this.highlighterSize
            : 10,
        color: this.tool === 'ink' ? this.inkColor : this.tool === 'highlighter' ? this.highlighterColor : 'black',
        points: [[pointer.x, pointer.y, pointer.p]],
        done: false,
        bbox: {
          minX: pointer.x,
          minY: pointer.y,
          maxX: pointer.x + 1,
          maxY: pointer.y + 1000,
        },
        pen: this.isPenMode,
        type: userType,
      },
      false
    )
  }

  /**
   * Complete a stroke (probably the current one).
   *
   * @private
   */
  private completeStroke(stroke: Stroke) {
    stroke.done = true
    stroke.bbox = this.getBoundingBoxFromStroke(stroke)
    this.putStroke(stroke, false)
    this.emit('create-stroke', stroke)
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
  private paintStrokeToCanvas(opts: { ctx: CanvasRenderingContext2D; stroke: Stroke; outline: boolean }) {
    const {
      ctx,
      stroke: { color },
      outline,
    } = opts

    const pts = this.getFreehandStroke(opts)

    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1, n = pts.length - 1; i < n; i++) {
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
    }
    ctx.closePath()

    if (outline) {
      ctx.strokeStyle = color === COLORS[0] ? COLORS[5] : COLORS[0]
      ctx.lineWidth = (color === COLORS[0] ? 3 : 5) * DPR
      ctx.stroke()
    }

    ctx.fillStyle = color
    ctx.fill()
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
  private getFreehandStroke(opts: { ctx: CanvasRenderingContext2D; stroke: Stroke }) {
    const {
      stroke: { tool, points, size, done, pen },
    } = opts

    const isFatBrush = tool === 'eraser' || tool === 'highlighter'

    return getStroke(points, {
      size: (isFatBrush ? size * 2 : size) * DPR,
      last: done,
      easing: PEN_EASING,
      ...(pen
        ? {
            thinning: isFatBrush && !pen ? -0.65 : 0.65,
            streamline: 0.32,
            smoothing: 0.65,
            simulatePressure: false,
          }
        : {
            thinning: isFatBrush && !pen ? -0.65 : 0.65,
            streamline: 0.5,
            smoothing: 0.62,
            simulatePressure: true,
          }),
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

    this.paintStrokeToCanvas({ ctx, stroke, outline: stroke.tool === 'ink' && stroke.type === UserType.admin })

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

    const padding = stroke.size * (stroke.tool === 'ink' ? 2 : 8)

    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    return { minX, minY, maxX, maxY }
  }

  private getYOffsetFromTime(time: number): number {
    return (time - this.startTime) / (16 / this.speed)
  }

  private getCurrentYOffsetForStroke(stroke: Stroke) {
    return this.getYOffsetFromTime(this.now) - this.getYOffsetFromTime(stroke.createdAt)
  }

  private isPenEvent(event: React.PointerEvent | PointerEvent): boolean {
    return (
      // if it's a pen, then it should support pressure
      event.pointerType === 'pen' ||
      !(
        // otherwise, look at the event's pressure;
        // wacoms etc will use 'mouse' but report pressure,
        // for regular devices the spec for default pressure is .5
        // but some report 0 (iphones) or 1 (?) instead.
        (event.pressure === 0 || event.pressure === 1 || event.pressure === 0.5)
      )
    )
  }

  /**
   * The main loop, called every frame.
   *
   * @private
   */
  private tick = () => {
    const now = Date.now()
    const elapsed = now - this.now

    // Is this a 60fps frame?
    const is60fpsFrame = elapsed > 16

    if (this.state === 'pointing' && this.currentStrokeId) {
      const stroke = this.strokes.get(this.currentStrokeId)
      if (!stroke) return

      // Only regenerate eraser frames while drawing with ink
      if (this.tool === 'ink' && this.eraserFrames < 400) {
        this.eraserFrames++
      }

      // Add the current point to the current stroke (even if we're between frames)
      const { pointer } = this
      const offset = this.getCurrentYOffsetForStroke(stroke)
      stroke.points.push([pointer.x, pointer.y + offset, pointer.p])

      // only update the shape if it's a 60fps frame
      if (is60fpsFrame) {
        this.putStroke(stroke, false)

        // When we see a looooong stroke, stop and start a new one
        if (stroke.points.length > 1000) {
          this.completeStroke(stroke)
          this.beginStroke()
        }

        if (this.tool === 'eraser') {
          this.eraserFrames--
          if (this.eraserFrames <= 0) {
            this.eraserFrames = -2000
            this.completeStroke(stroke)
            this.currentStrokeId = null
            this.state = 'idle'
          }
        }
      }
    }

    if (is60fpsFrame) {
      // cull shapes that are offscreen
      this.strokes.forEach((stroke) => {
        // If the stroke is done and is off screen...
        const offset = this.getCurrentYOffsetForStroke(stroke)
        if (stroke.done && stroke.bbox.maxY - offset < 0) {
          // Ffr Safari, shrink the canvas to free it up
          const canvas = canvases.get(stroke)

          if (canvas) {
            canvas.width = 0
            canvas.height = 0
          }

          // delete the stroke
          this.strokes.delete(stroke.id)

          // share the event
          this.emit('deleted-stroke', stroke.id)
        }
      })

      // update the current time
      this.now = now
    }

    // paint the canvas on every frame (even >60fps frames)
    this.render()

    // and set the next frame
    requestAnimationFrame(this.tick)
  }

  /**
   * Paint the current frame. This is called on every animation frame.
   * It paints the baked strokes and renders current stroke.
   *
   * @private
   */
  private render(): void {
    const cvs = this.canvas
    const ctx = cvs.getContext('2d')

    if (!ctx) return

    const { strokes } = this

    ctx.resetTransform()
    ctx.clearRect(0, 0, cvs.width, cvs.height)

    const offset = this.getYOffsetFromTime(this.now)

    // Separate the strokes into regular and admin strokes
    const regularStrokes: Stroke[] = []
    const adminStrokes: Stroke[] = []

    strokes.forEach((stroke) => {
      switch (stroke.type) {
        case UserType.admin: {
          adminStrokes.push(stroke)
          break
        }
        default: {
          regularStrokes.push(stroke)
        }
      }
    })

    regularStrokes
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((stroke) => {
        // Translate the canvas to the correct position
        ctx.resetTransform()
        ctx.translate(0, this.getYOffsetFromTime(stroke.createdAt) - offset)

        // Eraser is destination-out, highlighter is multiply, everything else is source-over
        ctx.globalCompositeOperation =
          stroke.tool === 'eraser' ? 'destination-out' : stroke.tool === 'highlighter' ? 'multiply' : 'source-over'

        if (stroke.done) {
          // Get (or create) a cached image for the stroke
          const canvas = this.getCanvasForStroke(stroke)
          // Stamp it to the canvas
          if (canvas) ctx.drawImage(canvas, stroke.bbox.minX, stroke.bbox.minY)
        } else {
          // Paint the foreground
          this.paintStrokeToCanvas({ ctx, stroke, outline: false })
        }
      })

    // Now paint all of the admin strokes (on top of the others)
    // which are completed.
    adminStrokes
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((stroke) => {
        // Translate the canvas to the correct position
        ctx.resetTransform()
        ctx.translate(0, this.getYOffsetFromTime(stroke.createdAt) - offset)

        // Eraser is destination-out, highlighter is multiply, everything else is source-over
        ctx.globalCompositeOperation =
          stroke.tool === 'eraser' ? 'destination-out' : stroke.tool === 'highlighter' ? 'multiply' : 'source-over'

        if (stroke.done) {
          // Get (or create) a cached image for the stroke
          const canvas = this.getCanvasForStroke(stroke)
          // Stamp it to the canvas
          if (canvas) ctx.drawImage(canvas, stroke.bbox.minX, stroke.bbox.minY)
        } else {
          // Paint the foreground
          this.paintStrokeToCanvas({ ctx, stroke, outline: stroke.tool === 'ink' })
        }
      })
  }
}
