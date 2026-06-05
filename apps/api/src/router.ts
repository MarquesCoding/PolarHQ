import { config } from "@workspace/config"
import { z } from "zod"
import { listTimeline } from "./photos/service"
import { protectedProcedure, publicProcedure, router } from "./trpc"

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, app: config.appName })),
  photos: router({
    timeline: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(200).default(50),
          cursor: z.string().optional(),
        }),
      )
      .query(({ ctx, input }) => listTimeline(ctx.userId, input.limit, input.cursor)),
  }),
})

export type AppRouter = typeof appRouter
