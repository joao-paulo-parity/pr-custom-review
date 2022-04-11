import { Probot } from "probot"

import { Logger } from "./logger"

export type ServerContext = {
  bot: Probot
  gitlab: { accessToken: string; domain: string; targetGroup: string }
  logger: Logger
}
