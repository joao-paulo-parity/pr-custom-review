import { normalizeValue } from "src/utils"

type LoggingImplementation = {
  log: (...args: any[]) => void
  error: (...args: any[]) => void
}

enum LoggingLevel {
  info,
  warn,
  error,
}
type LoggingLevels = keyof typeof LoggingLevel

export type LogFormat = "json" | "none"

export class Logger {
  constructor(
    public options: {
      name: string
      logFormat: LogFormat
      minLogLevel: LoggingLevels
      impl: LoggingImplementation
      context?: Record<string, any>
    },
  ) {}

  child(context: Record<string, unknown>) {
    /*
      Adjust keys in order to prevent overriding existing data in the context
      with the same key
    */
    const currentContextKeys = Object.keys(this.options.context ?? {})
    const adjustedContext: { [key: string]: unknown } = {}
    for (const [key, value] of Object.entries(context)) {
      let suggestedName = key
      while (currentContextKeys.includes(suggestedName)) {
        suggestedName = `${suggestedName} (${new Date().toISOString()})`
      }
      adjustedContext[suggestedName] = value
      currentContextKeys.push(suggestedName)
    }
    return new Logger({
      ...this.options,
      context: { ...this.options.context, ...adjustedContext },
    })
  }

  private log(level: LoggingLevels, item: any, description?: string) {
    if (LoggingLevel[level] < LoggingLevel[this.options.minLogLevel]) {
      return
    }

    const loggingFunction = (() => {
      switch (level) {
        case "info":
        case "warn": {
          return this.options.impl.log
        }
        case "error": {
          return this.options.impl.error
        }
        default: {
          const exhaustivenessCheck: never = level
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`Not exhaustive: ${exhaustivenessCheck}`)
        }
      }
    })()

    switch (this.options.logFormat) {
      case "json": {
        loggingFunction(
          JSON.stringify({
            level,
            name: this.options.name,
            context: this.options.context,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            msg: normalizeValue(item),
            description,
          }),
        )
        break
      }
      default: {
        const tag = `${level.toUpperCase()} (${this.options.name}):`
        loggingFunction(
          tag,
          ...(description ? [description] : []),
          ...(this.options.context === undefined
            ? []
            : ["~@ Context:", normalizeValue(this.options.context)]),
          normalizeValue(item),
        )
        break
      }
    }
  }

  private loggerCallback(level: LoggingLevels) {
    return (item: any, description?: string) => {
      return this.log(level, item, description)
    }
  }
  info = this.loggerCallback("info")
  warn = this.loggerCallback("warn")
  error = this.loggerCallback("error")
}
