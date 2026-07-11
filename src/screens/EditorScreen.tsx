import { TopToolbar } from '../components/toolbar/TopToolbar'
import { CanvasRoot } from '../components/canvas/CanvasRoot'
import { BottomPalette } from '../components/palette/BottomPalette'
import { PlacementToolbar } from '../components/tools/PlacementToolbar'
import { useDesignStore } from '../store/useDesignStore'

export function EditorScreen() {
  const activeTool = useDesignStore(s => s.activeTool)
  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden relative">
      <TopToolbar />
      <CanvasRoot />
      {activeTool === 'none' ? <BottomPalette /> : <PlacementToolbar />}
    </div>
  )
}
