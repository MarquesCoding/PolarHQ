import type { SplitApp } from "@lib/splitView"
import { type PayloadAction, createSlice } from "@reduxjs/toolkit"

export type ViewMode = "grid" | "table"

export interface UiState {
  activeAppId: string | null
  searchQuery: string
  sidebarCollapsed: boolean
  viewMode: ViewMode
  driveDetailsOpen: boolean
  splitApp: SplitApp | null
  splitRatio: number
}

const initialState: UiState = {
  activeAppId: null,
  searchQuery: "",
  sidebarCollapsed: false,
  viewMode: "grid",
  driveDetailsOpen: false,
  splitApp: null,
  splitRatio: 0.5,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveApp: (state, action: PayloadAction<string | null>) => {
      state.activeAppId = action.payload
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload
    },
    setDriveDetailsOpen: (state, action: PayloadAction<boolean>) => {
      state.driveDetailsOpen = action.payload
    },
    setSplitApp: (state, action: PayloadAction<SplitApp | null>) => {
      state.splitApp = action.payload
    },
    setSplitRatio: (state, action: PayloadAction<number>) => {
      state.splitRatio = Math.min(0.8, Math.max(0.2, action.payload))
    },
  },
})

export const {
  setActiveApp,
  setSearchQuery,
  toggleSidebar,
  setViewMode,
  setDriveDetailsOpen,
  setSplitApp,
  setSplitRatio,
} = uiSlice.actions

export default uiSlice.reducer
