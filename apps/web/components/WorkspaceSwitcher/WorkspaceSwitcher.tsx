"use client"

import { APP_NAME } from "@lib/env"
import WorkspaceSwitcherBase from "@workspace/ui/components/workspace-switcher"

interface WorkspaceSwitcherProps {
  productName: string
  icon: string
  collapsed: boolean
  beta?: boolean
}

const WorkspaceSwitcher = ({ productName, icon, collapsed, beta }: WorkspaceSwitcherProps) => (
  <WorkspaceSwitcherBase
    appName={APP_NAME}
    productName={productName}
    icon={icon}
    collapsed={collapsed}
    beta={beta}
  />
)

export default WorkspaceSwitcher
