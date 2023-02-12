import { useEffect, useState } from 'react'
import { TogetherApp } from '../Together/TogetherApp'
import { Stroke } from '../Together/types'

import * as Y from 'yjs'
import { yStrokes, provider, doc, awareness } from '../utils/y'

export function useYjs(app: TogetherApp) {
	const [isSynced, setIsSynced] = useState(false)

	useEffect(() => {
		const fn = (stroke: Stroke) => {
			const yStroke = new Y.Map()
			for (const key in stroke) {
				yStroke.set(key, stroke[key as keyof Stroke])
			}

			yStrokes.set(stroke.id, yStroke)
		}

		app.on('updated-stroke', fn)
		return () => {
			app.off('updated-stroke', fn)
		}
	})

	useEffect(() => {
		const fn = (id: string) => {
			yStrokes.delete(id)
		}

		app.on('deleted-stroke', fn)
		return () => {
			app.off('deleted-stroke', fn)
		}
	})

	// Subscribe to changes in the ydocs array
	useEffect(() => {
		function handleChange(a: Y.YMapEvent<Y.Map<any>>, b: Y.Transaction) {
			a.changes.keys.forEach((_, id) => {
				const stroke = yStrokes.get(id)
				if (stroke) {
					app.putStroke(stroke.toJSON() as Stroke, true)
				}
			})
		}

		yStrokes.observe(handleChange)

		return () => {
			yStrokes.unobserve(handleChange)
		}
	}, [])

	// Handle the provider connection. Include a listener
	// on the window to disconnect automatically when the
	// tab or window closes.
	useEffect(() => {
		function handleConnect() {
			setIsSynced(true)
			yStrokes.forEach((yStroke) => {
				app.putStroke(yStroke.toJSON() as Stroke, true)
			})
		}

		function handleDisconnect() {
			provider.off('sync', handleConnect)
			provider.disconnect()
			setIsSynced(false)
		}

		window.addEventListener('beforeunload', handleDisconnect)

		provider.on('sync', handleConnect)

		provider.connect()

		return () => {
			handleDisconnect()
			window.removeEventListener('beforeunload', handleDisconnect)
		}
	}, [])

	return { isSynced }
}
