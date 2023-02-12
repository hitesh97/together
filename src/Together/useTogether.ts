import { useCallback, useEffect, useRef, useState } from 'react'
import { doc } from '../utils/y'
import { COLORS, SIZES, TOOLS } from './constants'
import { TogetherApp } from './TogetherApp'
import { Stroke } from './types'

export function useTogether({
	onMount,
	onStrokeUpdate,
}: {
	onMount?: (app: TogetherApp) => void
	onStrokeUpdate?: (stroke: Stroke) => void
}) {
	const rContainer = useRef<HTMLDivElement>(null)
	const [app] = useState<TogetherApp>(() => new TogetherApp())

	const [tool, _setTool] = useState<typeof TOOLS[number]>(TOOLS[0])

	const [inkColor, _setInkColor] = useState<typeof COLORS[number]>(COLORS[0])
	const [inkSize, _setInkSize] = useState<typeof SIZES[number]>(SIZES[1])

	const [highlighterSize, _setHighlighterSize] = useState<typeof SIZES[number]>(
		SIZES[2]
	)
	const [highlighterColor, _setHighlighterColor] = useState<
		typeof COLORS[number]
	>(COLORS[5])

	const [eraserSize, _setEraserSize] = useState<typeof SIZES[number]>(SIZES[2])

	useEffect(() => {
		const container = rContainer.current
		if (!container) return

		app.mount(container)
		app.start()

		if (onMount) onMount(app)

		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'd':
				case 'x':
				case 'b': {
					setTool('ink')
					app.setTool('ink')
					break
				}
				case 'e': {
					setTool('eraser')
					app.setTool('eraser')
					break
				}
				case 's':
				case 'h': {
					setTool('highlighter')
					app.setTool('highlighter')
					break
				}
			}
		}

		const cancelEvent = (e: Event) => e.preventDefault()

		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('resize', app.onResize)
		window.addEventListener('touchstart', cancelEvent)
		window.addEventListener('touchend', cancelEvent)
		window.addEventListener('touchmove', cancelEvent)

		const unsubs = [
			() => {
				window.removeEventListener('keydown', handleKeyDown)
				window.removeEventListener('resize', app.onResize)
				window.removeEventListener('touchstart', cancelEvent)
				window.removeEventListener('touchend', cancelEvent)
				window.removeEventListener('touchmove', cancelEvent)
			},
		]

		if (onStrokeUpdate) {
			app.on('updated-stroke', onStrokeUpdate)
			unsubs.push(() => app.off('updated-stroke', onStrokeUpdate))
		}

		return () => {
			app.stop()
			unsubs.forEach((fn) => fn())
		}
	}, [app, onStrokeUpdate, onMount])

	const setTool = useCallback(
		(value: typeof TOOLS[number]) => {
			_setTool(value)
			app.setTool(value)
		},
		[app]
	)

	const setInkSize = useCallback(
		(value: typeof SIZES[number]) => {
			_setInkSize(value)
			app.setInkSize(value)
		},
		[app]
	)

	const setEraserSize = useCallback(
		(value: typeof SIZES[number]) => {
			_setEraserSize(value)
			app.setEraserSize(value)
		},
		[app]
	)

	const setHighlighterSize = useCallback(
		(value: typeof SIZES[number]) => {
			_setHighlighterSize(value)
			app.setHighlighterSize(value)
		},
		[app]
	)

	const setInkColor = useCallback(
		(value: typeof COLORS[number]) => {
			_setInkColor(value)
			app.setInkColor(value)
		},
		[app]
	)

	const setHighlighterColor = useCallback(
		(value: typeof COLORS[number]) => {
			_setHighlighterColor(value)
			app.setHighlighterColor(value)
		},
		[app]
	)

	const size =
		tool === 'ink'
			? inkSize
			: tool === 'highlighter'
			? highlighterSize
			: eraserSize

	const color =
		tool === 'ink' ? inkColor : tool === 'highlighter' ? highlighterColor : null

	const setSize =
		tool === 'ink'
			? setInkSize
			: tool === 'highlighter'
			? setHighlighterSize
			: setEraserSize

	const setColor =
		tool === 'ink'
			? setInkColor
			: tool === 'highlighter'
			? setHighlighterColor
			: null

	return {
		app,
		rContainer,
		tool,
		setTool,
		size,
		color,
		setSize,
		setColor,
	}
}
