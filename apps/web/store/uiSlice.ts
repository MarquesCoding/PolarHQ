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
  splitSide: "left" | "right"
}

const initialState: UiState = {
  activeAppId: null,
  searchQuery: "",
  sidebarCollapsed: false,
  viewMode: "grid",
  driveDetailsOpen: false,
  splitApp: null,
  splitRatio: 0.5,
  splitSide: "right",
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
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
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
      state.splitRatio = Math.min(0.75, Math.max(0.25, action.payload))
    },
    setSplitSide: (state, action: PayloadAction<"left" | "right">) => {
      state.splitSide = action.payload
    },
  },
})

export const {
  setActiveApp,
  setSearchQuery,
  toggleSidebar,
  setSidebarCollapsed,
  setViewMode,
  setDriveDetailsOpen,
  setSplitApp,
  setSplitRatio,
  setSplitSide,
} = uiSlice.actions

export default uiSlice.reducer
