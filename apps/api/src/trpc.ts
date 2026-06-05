import { TRPCError, initTRPC } from "@trpc/server"

export interface TrpcContext {
  userId: string | null
}

const t = initTRPC.context<TrpcContext>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" })
  return next({ ctx: { userId: ctx.userId } })
})
