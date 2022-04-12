import { Octokit } from "@octokit/rest"

import { processReviews } from "src/core"
import Logger from "src/logger"
import { CommitState, Context, PR } from "src/types"
import { envNumberVar, envVar } from "src/utils"

const main = async () => {
  const ciJobUrl = envVar("CI_JOB_URL")

  const githubToken = envVar("GITHUB_TOKEN")
  console.log({ githubToken })
  const octokit = new Octokit({ auth: githubToken })

  const githubOwner = envVar("GITHUB_ORG")
  const githubRepo = envVar("GITHUB_REPO")
  const prNumber = envNumberVar("CI_COMMIT_REF_NAME")

  const prResponse = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    { owner: githubOwner, repo: githubRepo, pull_number: prNumber },
  )
  const pr = prResponse.data as PR

  const logger = new Logger()

  const finishProcessReviews = async (state: CommitState) => {
    logger.info(`Final state: ${state}`)

    switch (state) {
      case "error":
      case "failure": {
        process.exit(1)
        break
      }
      case "pending":
      case "success": {
        process.exit(0)
        break
      }
      default: {
        const exhaustivenessCheck: never = state
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Not exhaustive: ${exhaustivenessCheck}`)
      }
    }
  }

  const ctx: Context = { logger, octokit, pr, finishProcessReviews }

  await processReviews(ctx)
}

void main()
