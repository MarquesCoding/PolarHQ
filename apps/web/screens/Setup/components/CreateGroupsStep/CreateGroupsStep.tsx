"use client"

import { useState } from "react"
import { type Group, createGroup } from "@lib/setup"
import { useForm } from "@tanstack/react-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { IconUsersGroup } from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string(),
})

interface CreateGroupsStepProps {
  onFinish: () => void
}

const CreateGroupsStep = ({ onFinish }: CreateGroupsStepProps) => {
  const [groups, setGroups] = useState<Group[]>([])

  const form = useForm({
    defaultValues: { name: "", description: "" },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      try {
        const { group } = await createGroup({
          name: value.name,
          description: value.description || undefined,
        })
        setGroups((previous) => [...previous, group])
        form.reset()
        toast.success(`Created group “${group.name}”`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create group")
      }
    },
  })

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground text-sm">
        Groups let you assign shared roles and limits (like storage quotas) to many users at once.
        Create a few now, or skip and do this later in admin settings.
      </p>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Field name="name">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Group name</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Power Users"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Label htmlFor={field.name}>Description (optional)</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Larger quota, early features"
              />
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add group"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {groups.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li
              key={group.id}
              className="border-border flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <IconUsersGroup className="size-4 shrink-0" />
              <span className="font-medium">{group.name}</span>
              {group.description ? (
                <span className="text-muted-foreground truncate">— {group.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Button onClick={onFinish} className="mt-1">
        {groups.length > 0 ? "Finish setup" : "Skip & finish"}
      </Button>
    </div>
  )
}

export default CreateGroupsStep
