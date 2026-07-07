import { type PayloadAction, createSlice } from "@reduxjs/toolkit"

export type ViewMode = "grid" | "table" | "columns"

export interface UiState {
  activeAppId: string | null
  searchQuery: string
  sidebarCollapsed: boolean
  viewMode: ViewMode
  driveDetailsOpen: boolean
  /** Luminance of the content behind the floating chrome while a media viewer is open, so every
   *  floating element can contrast it: `true` = light content (use dark chrome), `false` = dark
   *  content (use light chrome), `null` = no viewer open (default chrome / hidden well). */
  focusContentLight: boolean | null
}

const initialState: UiState = {
  activeAppId: null,
  searchQuery: "",
  sidebarCollapsed: false,
  viewMode: "grid",
  driveDetailsOpen: false,
  focusContentLight: null,
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
    setFocusContentLight: (state, action: PayloadAction<boolean | null>) => {
      state.focusContentLight = action.payload
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
  setFocusContentLight,
} = uiSlice.actions

export default uiSlice.reducer
