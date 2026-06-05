import { db, schema } from "@workspace/db"
import { and, eq, inArray } from "drizzle-orm"

export type LimitValueType = "bytes" | "count" | "duration" | "boolean" | "enum"
export type LimitStrategy = "min" | "max" | "override"
export type LimitValue = number | string | boolean | null

export interface LimitDef {
  key: string
  type: LimitValueType
  strategy: LimitStrategy
  systemDefault: LimitValue
}

const registry = new Map<string, LimitDef>()

/** Register a limit definition. Called by each app module at boot. */
export const registerLimit = (def: LimitDef): void => {
  registry.set(def.key, def)
}

export const getLimitDef = (key: string): LimitDef | undefined => registry.get(key)

const aggregate = (values: LimitValue[], strategy: LimitStrategy): LimitValue => {
  if (values.length === 0) return null
  const first = values[0] ?? null
  if (strategy === "override") return first
  const numbers = values.filter((value): value is number => typeof value === "number")
  if (numbers.length === 0) return first
  return strategy === "min" ? Math.min(...numbers) : Math.max(...numbers)
}

const getGroupIds = async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({ groupId: schema.groupMembers.groupId })
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.userId, userId))
  return rows.map((row) => row.groupId)
}

const fetchLimits = async (
  subjectType: "user" | "group" | "instance",
  subjectIds: string[],
  key: string,
): Promise<LimitValue[]> => {
  if (subjectIds.length === 0) return []
  const rows = await db
    .select({ value: schema.limits.value })
    .from(schema.limits)
    .where(
      and(
        eq(schema.limits.subjectType, subjectType),
        inArray(schema.limits.subjectId, subjectIds),
        eq(schema.limits.key, key),
      ),
    )
  return rows.map((row) => row.value as LimitValue)
}

/**
 * Resolve a limit for a user with precedence: user override > group > instance
 * (global) default > system default. The highest layer with a value wins
 * outright; only peer values at the same layer combine via the limit strategy.
 */
export const resolveLimit = async (userId: string, key: string): Promise<LimitValue> => {
  const def = registry.get(key)
  const strategy: LimitStrategy = def?.strategy ?? "override"

  const userValues = await fetchLimits("user", [userId], key)
  if (userValues.length > 0) return userValues[0] ?? null

  const groupIds = await getGroupIds(userId)
  const groupValues = await fetchLimits("group", groupIds, key)
  if (groupValues.length > 0) return aggregate(groupValues, strategy)

  const instanceValues = await fetchLimits("instance", ["instance"], key)
  if (instanceValues.length > 0) return instanceValues[0] ?? null

  return def?.systemDefault ?? null
}
