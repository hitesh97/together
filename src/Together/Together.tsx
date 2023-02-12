import { useState } from 'react'
import { useYjs } from '../hooks/useYjs'
import { COLORS, SIZES, TOOLS } from './constants'
import { TogetherApp } from './TogetherApp'
import { Stroke } from './types'
import { useTogether } from './useTogether'

export interface TogetherProps {
	onMount?: (app: TogetherApp) => void
	onStrokeUpdate?: (stroke: Stroke) => void
}

export function Together({ onMount, onStrokeUpdate }: TogetherProps) {
	const { app, rContainer } = useTogether({ onMount, onStrokeUpdate })

	const [tool, setTool] = useState<typeof TOOLS[number]>(TOOLS[0])
	const [color, setColor] = useState<typeof COLORS[number]>(COLORS[0])
	const [size, setSize] = useState<typeof SIZES[number]>(SIZES[1])

	useYjs(app)

	return (
		<div className="app">
			<div
				className="canvas-container"
				ref={rContainer}
				onPointerMove={app.onPointerMove}
				onPointerDown={app.onPointerDown}
				onPointerUp={app.onPointerUp}
			/>
			<div className="panel panel-left">
				<div className="tools">
					{TOOLS.map((value) => (
						<button
							key={value}
							title={value}
							data-active={tool === value}
							onPointerDown={() => {
								setTool(value)
								app.tool = value
							}}
						>
							<img src={`/tool-${value}.svg`} alt={value} />
						</button>
					))}
				</div>
			</div>
			<div className="panel panel-right">
				{tool === 'ink' && (
					<div className="colors">
						{COLORS.map((value) => (
							<button
								key={value}
								title={value}
								data-active={color === value}
								onPointerDown={() => {
									setColor(value)
									app.color = value
								}}
								style={{ color: value }}
							></button>
						))}
					</div>
				)}
				{tool === 'ink' && <div className="vertical-divider" />}
				<div className="sizes">
					{SIZES.map((value) => (
						<button
							key={value}
							title={value + ''}
							data-active={size === value}
							data-size={value}
							onPointerDown={() => {
								setSize(value)
								app.size = value
							}}
						></button>
					))}
				</div>
			</div>
			<a
				href="https://twitter.com/tldraw"
				target="_blank"
				rel="nofollow noopener"
				className="by-tldraw"
			>
				<img src="/by-tldraw.svg" alt="by tldraw" />
			</a>
		</div>
	)
}
