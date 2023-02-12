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

		window.addEventListener('resize', app.onResize)

		const unsubs = [() => window.removeEventListener('resize', app.onResize)]

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
