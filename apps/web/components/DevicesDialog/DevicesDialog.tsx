"use client"

import { type Device, fetchDevices, revokeDevice, timeAgo } from "@lib/account"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  IconDeviceDesktop,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconWorld,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import Spinner from "@components/Spinner/Spinner"
import { toast } from "sonner"

interface DevicesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const iconFor = (platform: Device["platform"]) => {
  switch (platform) {
    case "ios":
    case "android":
      return IconDeviceMobile
    case "mac":
      return IconDeviceLaptop
    case "windows":
    case "linux":
      return IconDeviceDesktop
    default:
      return IconWorld
  }
}

const DevicesDialog = ({ open, onOpenChange }: DevicesDialogProps) => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["account", "devices"],
    queryFn: fetchDevices,
    enabled: open,
  })

  const revoke = useMutation({
    mutationFn: revokeDevice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account", "devices"] })
      toast.success("Device signed out")
    },
    onError: () => toast.error("Couldn't sign out that device"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devices &amp; sessions</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-5" />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {data?.devices.map((device) => {
              const Icon = iconFor(device.platform)
              return (
                <div
                  key={device.id}
                  className="hover:bg-muted/60 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                >
                  <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{device.label}</span>
                      {device.current ? (
                        <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                          This device
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {device.ipAddress ? `${device.ipAddress} · ` : ""}
                      {device.current ? "Active now" : `Last active ${timeAgo(device.lastActive)}`}
                    </p>
                  </div>
                  {device.current ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke.mutate(device.id)}
                      disabled={revoke.isPending}
                    >
                      Sign out
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DevicesDialog
