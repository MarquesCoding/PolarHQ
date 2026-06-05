"use client"

import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import { usePersistentNumber } from "@lib/persistentSetting"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

const TitleBar = () => {
  const [rowHeight, setRowHeight] = usePersistentNumber("photos.rowHeight", 180)
  return (
    <SuiteTitleBar
      searchPlaceholder="Search your photos"
      extra={<SizeControl value={rowHeight} onChange={setRowHeight} />}
    />
  )
}

export default TitleBar
