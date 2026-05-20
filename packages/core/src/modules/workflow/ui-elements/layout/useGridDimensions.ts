import { useWindowDimensions } from 'react-native'

const GRID_COLUMNS = 12
const HORIZONTAL_PADDING = 16

export interface GridDimensions {
  screenWidth: number
  contentWidth: number
  columnWidth: number
}

export function useGridDimensions(horizontalPadding = HORIZONTAL_PADDING): GridDimensions {
  const { width: screenWidth } = useWindowDimensions()
  const contentWidth = screenWidth - horizontalPadding * 2
  const columnWidth = contentWidth / GRID_COLUMNS

  return { screenWidth, contentWidth, columnWidth }
}

export function computeItemWidth(col: number | undefined, containerWidth: number): number {
  const span = Math.max(1, Math.min(col ?? GRID_COLUMNS, GRID_COLUMNS))
  return (span / GRID_COLUMNS) * containerWidth
}
