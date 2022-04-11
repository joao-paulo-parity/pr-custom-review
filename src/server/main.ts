import { Logger as ProbotLogger, Probot, Server } from "probot"
import { getLog } from "probot/lib/helpers/get-log"

import { envNumberVar, envVar } from "src/utils"

import { Logger } from "./logger"
import { setup } from "./setup"

const main = async () => {
  const logFormat = (() => {
    const logFormatVar = envVar("LOG_FORMAT")
    switch (logFormatVar) {
      case "json":
      case "none": {
        return logFormatVar
      }
      default: {
        throw new Error(`Invalid LOG_FORMAT: ${logFormatVar}`)
      }
    }
  })()

  const logger = new Logger({
    name: "app",
    impl: console,
    logFormat,
    minLogLevel: "info",
  })

  /*
    Instead of spamming error messages once some uncaught error is found, log
    only the first event as "error" and subsequent ones as "info", then
    immediately exit the application.
  */
  let isTerminating = false
  for (const event of ["uncaughtException", "unhandledRejection"] as const) {
    /*
      https://nodejs.org/api/process.html#event-uncaughtexception
      https://nodejs.org/api/process.html#event-unhandledrejection
    */
    process.on(event, (error, origin) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorData = { event, error, origin }

      if (isTerminating) {
        logger.info(
          errorData,
          "Caught error event; it will not be logged as an error because the application is being terminated...",
        )
        return
      }
      isTerminating = true

      logger.error(
        errorData,
        "Caught error event; application will exit with an error exit code",
      )

      process.exit(1)
    })
  }

  const serverPort = envNumberVar("PORT")

  const gitlabDomain = envVar("GITLAB_DOMAIN")
  const gitlabAccessToken = envVar("GITLAB_ACCESS_TOKEN")
  const gitlabTargetGroup = envVar("GITLAB_TARGET_GROUP")

  const appId = envNumberVar("APP_ID")
  const privateKeyBase64 = envVar("PRIVATE_KEY_BASE64")
  const privateKey = Buffer.from(privateKeyBase64, "base64").toString()
  const webhookSecret = envVar("WEBHOOK_SECRET")

  const probotLogger: ProbotLogger | undefined =
    logFormat === "json"
      ? getLog({
          level: "error",
          logFormat: "json",
          logLevelInString: true,
          logMessageKey: "msg",
        })
      : undefined
  const probot = Probot.defaults({
    appId,
    privateKey,
    secret: webhookSecret,
    logLevel: "error",
    ...(probotLogger === undefined
      ? {}
      : { log: probotLogger.child({ name: "probot" }) }),
  })
  const server = new Server({
    Probot: probot,
    port: serverPort,
    ...(probotLogger === undefined
      ? {}
      : { log: probotLogger.child({ name: "server" }) }),
    webhookProxy: process.env.WEBHOOK_PROXY_URL,
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  await server.load((bot: Probot) => {
    setup({
      bot,
      gitlab: {
        accessToken: gitlabAccessToken,
        domain: gitlabDomain,
        targetGroup: gitlabTargetGroup,
      },
      logger,
    })
  })

  void server.start()
}

void main()
