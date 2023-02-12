import { useEffect, useRef, useState } from 'react'
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

	useEffect(() => {
		const container = rContainer.current
		if (!container) return

		app.mount(container)
		app.start()

		if (onMount) onMount(app)

		const cancelEvent = (e: Event) => e.preventDefault()

		window.addEventListener('resize', app.onResize)
		window.addEventListener('touchstart', cancelEvent)
		window.addEventListener('touchend', cancelEvent)
		window.addEventListener('touchmove', cancelEvent)

		const unsubs = [
			() => {
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

	return { app, rContainer }
}
