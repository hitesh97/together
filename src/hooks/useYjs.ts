import { useEffect, useState } from 'react'
import { TogetherApp } from '../Together/TogetherApp'
import { Stroke, UserCursor } from '../Together/types'

import * as Y from 'yjs'
import { yStrokes, provider, yUserCursors } from '../utils/y'

export function useYjs(app: TogetherApp) {
	const [isSynced, setIsSynced] = useState(false)

	// Handle stroke updates
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

	// Handle stroke deletes
	useEffect(() => {
		const fn = (id: string) => {
			yStrokes.delete(id)
		}

		app.on('deleted-stroke', fn)
		return () => {
			app.off('deleted-stroke', fn)
		}
	})

	// Subscribe to changes in the yStrokes array
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

	// Handle cursor updates

	// useEffect(() => {
	// 	const fn = (userCursor: UserCursor) => {
	// 		const yCursor = new Y.Map()
	// 		for (const key in userCursor) {
	// 			yCursor.set(key, userCursor[key as keyof UserCursor])
	// 		}
	// 		yUserCursors.set(userCursor.id, yCursor)
	// 	}
	// 	app.on('updated-user-cursor', fn)
	// 	return () => {
	// 		app.off('updated-user-cursor', fn)
	// 	}
	// })

	// Subscribe to changes in the yUserCursors array

	// useEffect(() => {
	// 	function handleChange(a: Y.YMapEvent<Y.Map<any>>) {
	// 		a.changes.keys.forEach((_, id) => {
	// 			if (_.action === 'delete') {
	// 				app.deleteUserCursor(_.oldValue.id)
	// 				return
	// 			}

	// 			const cursor = yUserCursors.get(id)
	// 			if (cursor) {
	// 				app.putUserCursor(cursor.toJSON() as UserCursor, true)
	// 			}
	// 		})
	// 	}

	// 	yUserCursors.observe(handleChange)

	// 	return () => {
	// 		yUserCursors.unobserve(handleChange)
	// 	}
	// }, [])

	// Handle the provider connection. Include a listener
	// on the window to disconnect automatically when the
	// tab or window closes.
	useEffect(() => {
		function handleConnect() {
			setIsSynced(true)

			yStrokes.forEach((yStroke) => {
				app.putStroke(yStroke.toJSON() as Stroke, true)
			})

			// const now = Date.now()
			// yUserCursors.forEach((cursor, id) => {
			// 	const lastChanged = cursor.get('lastChanged') as number
			// 	// on connect, purge all cursors that haven't been updated in 5 minutes
			// 	if (now - lastChanged > 1000 * 60 * 5) {
			// 		yUserCursors.delete(id as string)
			// 	}
			// })
		}

		function handleDisconnect() {
			yUserCursors.delete(app.id)
			provider.off('sync', handleConnect)
			provider.disconnect()
			setIsSynced(false)
		}

		window.addEventListener('beforeunload', handleDisconnect)

		provider.on('sync', handleConnect)
		provider.on('disconnect', handleDisconnect)

		provider.connect()

		return () => {
			handleDisconnect()
			window.removeEventListener('beforeunload', handleDisconnect)
		}
	}, [])

	return { isSynced }
}
