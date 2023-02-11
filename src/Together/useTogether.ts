import { useEffect, useRef, useState } from 'react'
import { TogetherApp } from './TogetherApp'
import { Stroke } from './types'

export function useTogether({
	onMount,
	onStrokeUpdate,
}: {
	onMount?: (app: TogetherApp) => void
	onStrokeUpdate?: (app: TogetherApp, stroke: Stroke) => void
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
			app.on('stroke-update', onStrokeUpdate)
			unsubs.push(() => app.off('stroke-update', onStrokeUpdate))
		}

		return () => {
			app.stop()
			unsubs.forEach((fn) => fn())
		}
	}, [app, onStrokeUpdate, onMount])

	return { app, rContainer }
}
