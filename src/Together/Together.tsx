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
  const { app, rContainer, tool, setTool, size, color, setSize, setColor } = useTogether({ onMount, onStrokeUpdate })

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
            <button key={value} title={value} data-active={tool === value} onPointerDown={() => setTool(value)}>
              <img src={`/tool-${value}.svg`} alt={value} />
            </button>
          ))}
        </div>
      </div>
      <div className="panel panel-right">
        {setColor && (
          <>
            <div className="colors">
              {COLORS.map((value) => (
                <button
                  key={value}
                  title={value}
                  data-active={color === value}
                  onPointerDown={() => setColor(value)}
                  style={{ color: value }}
                ></button>
              ))}
            </div>
            <div className="vertical-divider" />
          </>
        )}
        <div className="sizes">
          {SIZES.map((value) => (
            <button
              key={value}
              title={value + ''}
              data-active={size === value}
              data-size={value}
              onPointerDown={() => setSize(value)}
            ></button>
          ))}
        </div>
      </div>
      <div className="lower-right">
        <a href="https://twitter.com/tldraw" target="_blank" rel="nofollow noopener">
          <img className="tldraw" src="/by-tldraw.svg" alt="by tldraw" />
        </a>
        <a href="https://partykit.io" target="_blank" rel="nofollow noopener">
          Deployed on <img className="partykit" src="/partykit.svg" alt="partykit" />
        </a>
      </div>
    </div>
  )
}
