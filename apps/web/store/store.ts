import { configureStore } from "@reduxjs/toolkit"
import uiReducer from "@store/uiSlice"

export const makeStore = () =>
  configureStore({
    reducer: {
      ui: uiReducer,
    },
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
