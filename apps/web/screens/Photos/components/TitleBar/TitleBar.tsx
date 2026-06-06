"use client"

import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import { usePersistentNumber } from "@lib/persistentSetting"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"

const TitleBar = () => {
  const [rowHeight, setRowHeight] = usePersistentNumber("photos.rowHeight", 180)
  const [gap, setGap] = usePersistentNumber("photos.gap", 12)
  const [rounded, setRounded] = usePersistentNumber("photos.rounded", 1)
  return (
    <SuiteTitleBar
      searchPlaceholder="Search your photos"
      extra={
        <SizeControl
          value={rowHeight}
          onChange={setRowHeight}
          gap={gap}
          onGapChange={setGap}
          rounded={rounded === 1}
          onRoundedChange={(value) => setRounded(value ? 1 : 0)}
        />
      }
    />
  )
}

export default TitleBar
