'use client'
import { JSX, useLayoutEffect, useState } from 'react'
import { highlight } from '@/libs/code-highlight'

export function CodeBlock({ initial, content }: { initial?: JSX.Element; content?: string }) {
  const [nodes, setNodes] = useState(initial)

  console.log('nodes', nodes)

  useLayoutEffect(() => {
    void highlight(content || 'console.log("Rendered on client")', 'ts').then(setNodes)
  }, [content])

  return nodes ?? <p>Loading...</p>
}