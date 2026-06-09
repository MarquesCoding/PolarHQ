"use client"

import { IconPlus, IconX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  type FilterOp,
  type FilterRule,
  makeId,
  OPERATOR_LABELS,
  operatorHasValue,
  operatorsFor,
  type Property,
  type SortRule,
  type ViewDef,
} from "./model"
import type { DatabaseState } from "./useDatabase"

const barClass = "bg-muted/30 border-border flex flex-col gap-2 border-b px-3 py-2"
const triggerClass = "w-40"

const ValueInput = ({
  property,
  value,
  onChange,
}: {
  property: Property
  value: unknown
  onChange: (value: unknown) => void
}) => {
  if (property.type === "select" || property.type === "multiSelect") {
    return (
      <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
        <SelectTrigger size="sm" className={triggerClass}>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {(property.options ?? []).map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (property.type === "number") {
    return (
      <Input
        type="number"
        value={value == null || value === "" ? "" : String(value)}
        className="h-8 w-40"
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
      />
    )
  }
  if (property.type === "date") {
    return (
      <Input
        type="date"
        value={typeof value === "string" ? value : ""}
        className="h-8 w-40"
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  return (
    <Input
      value={typeof value === "string" ? value : ""}
      placeholder="Value"
      className="h-8 w-40"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export const FilterBar = ({ db, view }: { db: DatabaseState; view: ViewDef }) => {
  const properties = db.properties.filter((property) => property.type !== "rollup")
  const filters = view.filters ?? []
  const propFor = (id: string) => properties.find((property) => property.id === id)

  const commit = (next: FilterRule[]) => db.updateView(view.id, { filters: next })
  const update = (id: string, patch: Partial<FilterRule>) =>
    commit(filters.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
  const remove = (id: string) => commit(filters.filter((rule) => rule.id !== id))
  const add = () => {
    const property = properties[0]
    if (!property) return
    commit([
      ...filters,
      { id: makeId(), propId: property.id, op: operatorsFor(property.type)[0]!, value: "" },
    ])
  }

  return (
    <div className={barClass}>
      {filters.length === 0 ? (
        <p className="text-muted-foreground text-sm">No filters yet.</p>
      ) : (
        filters.map((rule) => {
          const property = propFor(rule.propId)
          const ops = property ? operatorsFor(property.type) : []
          return (
            <div key={rule.id} className="flex flex-wrap items-center gap-2">
              <Select
                value={rule.propId}
                onValueChange={(next) => {
                  if (!next) return
                  const property = propFor(next)
                  update(rule.id, {
                    propId: next,
                    op: property ? operatorsFor(property.type)[0]! : rule.op,
                    value: "",
                  })
                }}
              >
                <SelectTrigger size="sm" className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={rule.op}
                onValueChange={(next) => next && update(rule.id, { op: next as FilterOp, value: "" })}
              >
                <SelectTrigger size="sm" className={triggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map((op) => (
                    <SelectItem key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {property && operatorHasValue(rule.op) ? (
                <ValueInput
                  property={property}
                  value={rule.value}
                  onChange={(value) => update(rule.id, { value })}
                />
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-7"
                onClick={() => remove(rule.id)}
              >
                <IconX className="size-4" />
              </Button>
            </div>
          )
        })
      )}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={add}
        >
          <IconPlus className="size-4" />
          Add filter
        </Button>
      </div>
    </div>
  )
}

export const SortBar = ({ db, view }: { db: DatabaseState; view: ViewDef }) => {
  const properties = db.properties.filter((property) => property.type !== "rollup")
  const sorts = view.sorts ?? []

  const commit = (next: SortRule[]) => db.updateView(view.id, { sorts: next })
  const update = (id: string, patch: Partial<SortRule>) =>
    commit(sorts.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)))
  const remove = (id: string) => commit(sorts.filter((rule) => rule.id !== id))
  const add = () => {
    const property = properties[0]
    if (!property) return
    commit([...sorts, { id: makeId(), propId: property.id, dir: "asc" }])
  }

  return (
    <div className={barClass}>
      {sorts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sorts yet.</p>
      ) : (
        sorts.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2">
            <Select
              value={rule.propId}
              onValueChange={(next) => next && update(rule.id, { propId: next })}
            >
              <SelectTrigger size="sm" className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={rule.dir}
              onValueChange={(next) => update(rule.id, { dir: next as "asc" | "desc" })}
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-7"
              onClick={() => remove(rule.id)}
            >
              <IconX className="size-4" />
            </Button>
          </div>
        ))
      )}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={add}
        >
          <IconPlus className="size-4" />
          Add sort
        </Button>
      </div>
    </div>
  )
}
