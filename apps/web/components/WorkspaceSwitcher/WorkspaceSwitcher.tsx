"use client"

import { APP_NAME } from "@lib/env"
import WorkspaceSwitcherBase from "@workspace/ui/components/workspace-switcher"

interface WorkspaceSwitcherProps {
  productName: string
  icon: string
  collapsed: boolean
}

const WorkspaceSwitcher = ({ productName, icon, collapsed }: WorkspaceSwitcherProps) => (
  <WorkspaceSwitcherBase
    appName={APP_NAME}
    productName={productName}
    icon={icon}
    collapsed={collapsed}
  />
)

export default WorkspaceSwitcher
