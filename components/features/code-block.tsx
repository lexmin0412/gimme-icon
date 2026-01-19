'use client'
import { JSX, useLayoutEffect, useState } from 'react'
import { highlight } from '@/libs/code-highlight'
import { useTranslations } from 'next-intl'

export function CodeBlock({ initial, content }: { initial?: JSX.Element; content?: string }) {
  const [nodes, setNodes] = useState(initial)
  const tCommon = useTranslations('Common')

  useLayoutEffect(() => {
    void highlight(content || 'console.log("Rendered on client")', 'ts').then(setNodes)
  }, [content])

  return nodes ?? <p>{tCommon('loading')}</p>
}
