import { useState } from 'react'
import { COLORS, SIZES, TOOLS } from './constants'
import { TogetherApp } from './TogetherApp'
import { Stroke } from './types'
import { useTogether } from './useTogether'

export interface TogetherProps {
	onMount?: (app: TogetherApp) => void
	onStrokeUpdate?: (app: TogetherApp, stroke: Stroke) => void
}

export function Together({ onMount, onStrokeUpdate }: TogetherProps) {
	const { app, rContainer } = useTogether({ onMount, onStrokeUpdate })

	const [tool, setTool] = useState<typeof TOOLS[number]>(TOOLS[0])
	const [color, setColor] = useState<typeof COLORS[number]>(COLORS[0])
	const [size, setSize] = useState<typeof SIZES[number]>(SIZES[1])

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
							data-active={tool === value}
							onClick={() => {
								setTool(value)
								app.tool = value
							}}
						>
							{value[0].toUpperCase() + value.slice(1)}
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
								data-active={color === value}
								onClick={() => {
									setColor(value)
									app.color = value
								}}
								style={{ color: value }}
							></button>
						))}
					</div>
				)}
				<div className="vertical-divider" />
				<div className="sizes">
					{SIZES.map((value) => (
						<button
							key={value}
							data-active={size === value}
							data-size={value}
							onClick={() => {
								setSize(value)
								app.size = value
							}}
						></button>
					))}
				</div>
			</div>
		</div>
	)
}
