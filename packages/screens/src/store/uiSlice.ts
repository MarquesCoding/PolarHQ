import { type PayloadAction, createSlice } from "@reduxjs/toolkit"

export type ViewMode = "grid" | "table" | "columns"

export type SettingsScope = "admin" | "account"

export type DriveSortKey = "name" | "size" | "modified" | "kind"
export type SortDir = "asc" | "desc"
export interface DriveSort {
  key: DriveSortKey
  dir: SortDir
}

export interface UiState {
  activeAppId: string | null
  searchQuery: string
  sidebarCollapsed: boolean
  viewMode: ViewMode
  driveSort: DriveSort
  driveDetailsOpen: boolean
  settingsScope: SettingsScope | null
  settingsSection: string | null
}

const initialState: UiState = {
  activeAppId: null,
  searchQuery: "",
  sidebarCollapsed: false,
  viewMode: "grid",
  driveSort: { key: "name", dir: "asc" },
  driveDetailsOpen: false,
  settingsScope: null,
  settingsSection: null,
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
    setDriveSort: (state, action: PayloadAction<DriveSort>) => {
      state.driveSort = action.payload
    },
    setDriveDetailsOpen: (state, action: PayloadAction<boolean>) => {
      state.driveDetailsOpen = action.payload
    },
    openSettings: (
      state,
      action: PayloadAction<{ scope: SettingsScope; section?: string }>,
    ) => {
      state.settingsScope = action.payload.scope
      state.settingsSection = action.payload.section ?? null
    },
    setSettingsSection: (state, action: PayloadAction<string>) => {
      state.settingsSection = action.payload
    },
    closeSettings: (state) => {
      state.settingsScope = null
      state.settingsSection = null
    },
  },
})

export const {
  setActiveApp,
  setSearchQuery,
  toggleSidebar,
  setSidebarCollapsed,
  setViewMode,
  setDriveSort,
  setDriveDetailsOpen,
  openSettings,
  setSettingsSection,
  closeSettings,
} = uiSlice.actions

export default uiSlice.reducer
