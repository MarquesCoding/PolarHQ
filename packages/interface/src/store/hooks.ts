import type { AppDispatch, RootState } from "@polarhq/interface/store/store"
import { useDispatch, useSelector } from "react-redux"

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
