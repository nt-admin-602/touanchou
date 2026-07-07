export type ShapeType = 'diamond' | 'triangle' | 'square'

export type GlassItem = {
  id: string
  shape: ShapeType
  colorId: string
  xMm: number
  yMm: number
  rotationDeg: number
}

export type DesignDocument = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  canvasWidthMm: number
  canvasHeightMm: number
  groutGapMm: number
  items: GlassItem[]
  dataVersion: number
}

export type Viewport = {
  zoom: number  // px per mm
  panX: number  // screen px
  panY: number  // screen px
}

export type GlassColor = {
  id: string
  label: string
  fill: string
  opacity: number
  isMirror?: boolean
}

export type Screen = 'new' | 'editor'
