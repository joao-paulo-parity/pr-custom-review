// Copy this file to .env.cjs and replace the placeholders

// All environment variables are required unless explicitly told otherwise

const fs = require("fs")
const path = require("path")

// Optionally set LOG_FORMAT to "json" for JSON logging
process.env.LOG_FORMAT ??= "none"

// Defines a port for the HTTP server
process.env.PORT ??= 3000

/*
  The following variables can acquired from:
  https://github.com/settings/apps/${APP}

  Guidance for registering an app is at:
  https://probot.github.io/docs/deployment/#register-the-github-app
*/
process.env.WEBHOOK_SECRET ??= "placeholder"
process.env.APP_ID ??= 123

/*
  The private key file can be generated and downloaded from:
  https://github.com/settings/apps/your-app
  Download it to ./githubPrivateKey.pem, which is already ignored on .gitignore
  It can be manually encoded with `base64 -w 0 <private-key>.pem`
*/
process.env.PRIVATE_KEY_BASE64 ??= Buffer.from(
  fs.readFileSync(path.join(__dirname, "githubPrivateKey.pem"), "utf-8"),
).toString("base64")

// GITLAB_DOMAIN defines the GitLab domain where the repositories are hosted
process.env.GITLAB_DOMAIN ??= "gitlab.domain.com"

// GITLAB_TARGET_GROUP defines the group where the repositories are hosted
process.env.GITLAB_TARGET_GROUP ??= "placeholder"

// GITLAB_ACCESS_TOKEN should have "write_api" scope in $GITLAB_TARGET_GROUP
process.env.GITLAB_ACCESS_TOKEN ??= "placeholder"

/*
  NOT REQUIRED, but useful during development

  Since GitHub is only able to send webhook events to publicly-accessible
  internet addresses, for local development you'll need an intermediary service
  which delivers the payload to your local instance (which is not exposed to the
  internet). An EventSource-compliant (https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
  service such as https://smee.io/ can be used for that.
  The same URL used in this variable should be used as the Webhook URL in
  https://github.com/settings/apps/your-app
*/
// process.env.WEBHOOK_PROXY_URL ??= "https://smee.io/placeholder"
