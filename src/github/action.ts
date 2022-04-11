import { getInput, setFailed } from "@actions/core"
import { context, getOctokit } from "@actions/github"

import { processReviews } from "src/core"
import Logger from "src/logger"
import { CommitState, Context, PR } from "src/types"

const main = async () => {
  if (
    context.eventName !== "pull_request" &&
    context.eventName !== "pull_request_review"
  ) {
    setFailed(
      `Invalid event: ${context.eventName}. This action should be triggered on pull_request and pull_request_review`,
    )
    return
  }

  const logger = new Logger()

  const pr = context.payload.pull_request as PR
  const octokit = getOctokit(getInput("token", { required: true }))

  const finishProcessReviews = async (state: CommitState) => {
    // Fallback URL in case we are not able to detect the current job
    let detailsUrl = `${context.serverUrl}/${pr.base.repo.owner.login}/${pr.base.repo.name}/actions/runs/${context.runId}`

    if (state === "failure") {
      const jobName = process.env.GITHUB_JOB
      if (jobName === undefined) {
        logger.warn("Job name was not found in the environment")
      } else {
        /*
          Fetch the jobs so that we'll be able to detect this step and provide a
          more accurate logging location
        */
        const {
          data: { jobs },
        } = await octokit.rest.actions.listJobsForWorkflowRun({
          owner: pr.base.repo.owner.login,
          repo: pr.base.repo.name,
          run_id: context.runId,
        })
        for (const job of jobs) {
          if (job.name === jobName) {
            let stepNumber: number | undefined = undefined
            const actionRepository = process.env.GITHUB_ACTION_REPOSITORY
            if (actionRepository === undefined) {
              logger.warn("Action repository was not found in the environment")
            } else {
              const actionRepositoryMatch = actionRepository.match(/[^/]*$/)
              if (actionRepositoryMatch === null) {
                logger.warn(
                  `Action repository name could not be extracted from ${actionRepository}`,
                )
              } else {
                const actionStep = job.steps?.find(({ name }) => {
                  return name === actionRepositoryMatch[0]
                })
                if (actionStep === undefined) {
                  logger.warn(
                    `Failed to find ${actionRepositoryMatch[0]} in the job's steps`,
                    job.steps,
                  )
                } else {
                  stepNumber = actionStep.number
                }
              }
            }
            detailsUrl = `${job.html_url as string}${
              stepNumber
                ? `#step:${stepNumber}:${logger.relevantStartingLine}`
                : ""
            }`
            break
          }
        }
      }
    }

    await octokit.rest.repos.createCommitStatus({
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      sha: pr.head.sha,
      state,
      context: "Check reviews",
      target_url: detailsUrl,
      description: "Please visit Details for more information",
    })

    logger.info(`Final state: ${state}`)

    /*
      We always exit with 0 so that there are no lingering failure statuses in
      the pipeline for the action. The custom status created above will be the
      one to inform the outcome of this action.
    */
    process.exit(0)
  }

  const ctx: Context = { logger, octokit, pr, finishProcessReviews }
  await processReviews(ctx)
}

void main()
