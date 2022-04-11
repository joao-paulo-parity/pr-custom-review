import fetch from "node-fetch"

import { ciJobName } from "./constants"
import { ServerContext } from "./types"

export const triggerCiJob = async (
  { gitlab, logger }: ServerContext,
  pr: { number: number; base: { repo: { name: string } } },
) => {
  const projectApi = `https://${
    gitlab.domain
  }/api/v4/projects/${encodeURIComponent(
    `${gitlab.targetGroup}/${pr.base.repo.name}`,
  )}`

  const targetJobRef = pr.number.toString()

  logger.info(
    { projectApi, pr, jobRef: targetJobRef },
    `Attempting to find the latest "${ciJobName}" job to retrigger`,
  )

  const gitlabHeaders = { "PRIVATE-TOKEN": gitlab.accessToken }

  let jobsPage = 1
  while (true) {
    const responseBody = await (
      await fetch(`${projectApi}/jobs?page=${jobsPage}&per_page=100`, {
        headers: gitlabHeaders,
      })
    ).text()
    const jobs = JSON.parse(responseBody) as {
      id: number
      name: string
      ref: string
    }[]

    if (jobs.length === 0) {
      break
    }

    for (const job of jobs) {
      if (job.ref === targetJobRef && job.name === ciJobName) {
        await fetch(`${projectApi}/jobs/${job.id}/retry`, {
          method: "POST",
          headers: gitlabHeaders,
        })
        return
      }
    }

    jobsPage++
  }
}
