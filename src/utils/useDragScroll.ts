import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'

/**
 * PC のマウスドラッグで横スクロールできるようにするフック。
 * タッチ操作はブラウザ標準のスクロールに任せ、マウスのみ対象にする。
 * ドラッグとみなした場合は直後の click を打ち消し、ボタンの誤クリックを防ぐ。
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const state = useRef({ dragging: false, startX: 0, startScrollLeft: 0, moved: false })

  const onPointerDown = (e: ReactPointerEvent<T>) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    state.current.dragging = true
    state.current.moved = false
    state.current.startX = e.clientX
    state.current.startScrollLeft = el.scrollLeft
  }

  const onPointerMove = (e: ReactPointerEvent<T>) => {
    if (!state.current.dragging) return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - state.current.startX
    if (Math.abs(dx) > 3) state.current.moved = true
    el.scrollLeft = state.current.startScrollLeft - dx
  }

  const endDrag = () => {
    state.current.dragging = false
  }

  const onClickCapture = (e: ReactMouseEvent<T>) => {
    if (state.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      state.current.moved = false
    }
  }

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerLeave: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
  }
}
