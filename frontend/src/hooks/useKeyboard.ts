import { useEffect } from 'react'

interface KeyMap {
  [key: string]: () => void
}

export function useKeyboard(keyMap: KeyMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      const key = e.key.toLowerCase()
      if (key === ' ' || key === 'space') {
        e.preventDefault()
        keyMap['space']?.()
        return
      }

      if (keyMap[key]) {
        e.preventDefault()
        keyMap[key]()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keyMap])
}
