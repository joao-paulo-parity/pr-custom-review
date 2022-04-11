import { triggerCiJob } from "./core"
import { ServerContext } from "./types"

export const setup = (ctx: ServerContext) => {
  const { bot } = ctx
  for (const eventName of [
    "pull_request_review",
    "pull_request.opened",
    "pull_request.unlocked",
    "pull_request.ready_for_review",
    "pull_request.reopened",
    "pull_request.synchronize",
    "pull_request.review_request_removed",
  ] as const) {
    bot.on(eventName, (event) => {
      void triggerCiJob(ctx, event.payload.pull_request)
    })
  }
}
