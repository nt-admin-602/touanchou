import { TopToolbar } from '../components/toolbar/TopToolbar'
import { CanvasRoot } from '../components/canvas/CanvasRoot'
import { BottomPalette } from '../components/palette/BottomPalette'
import { FloatingTools } from '../components/floating/FloatingTools'

export function EditorScreen() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden relative">
      <TopToolbar />
      <CanvasRoot />
      <BottomPalette />
      <FloatingTools />
    </div>
  )
}
