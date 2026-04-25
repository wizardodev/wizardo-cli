// Detect CI environment and extract git metadata from well-known env vars.
// All fields are optional — the CLI falls back to flags when not in CI.

export type CiContext = {
  provider: string | null
  sha: string | null
  branch: string | null
  message: string | null
  ciRunUrl: string | null
}

export function detectCi(): CiContext {
  const env = process.env

  // GitHub Actions
  if (env.GITHUB_ACTIONS === "true") {
    const runId = env.GITHUB_RUN_ID
    const repoUrl = env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${runId}`
      : null
    return {
      provider: "github-actions",
      sha: env.GITHUB_SHA ?? null,
      branch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || null,
      message: null,
      ciRunUrl: repoUrl,
    }
  }

  // Azure DevOps
  if (env.TF_BUILD === "True") {
    return {
      provider: "azure-devops",
      sha: env.BUILD_SOURCEVERSION ?? null,
      branch: env.BUILD_SOURCEBRANCHNAME ?? null,
      message: env.BUILD_SOURCEVERSIONMESSAGE ?? null,
      ciRunUrl: env.BUILD_BUILDURI ?? null,
    }
  }

  // GitLab CI
  if (env.GITLAB_CI === "true") {
    return {
      provider: "gitlab",
      sha: env.CI_COMMIT_SHA ?? null,
      branch: env.CI_COMMIT_REF_NAME ?? null,
      message: env.CI_COMMIT_MESSAGE ?? null,
      ciRunUrl: env.CI_PIPELINE_URL ?? null,
    }
  }

  // CircleCI
  if (env.CIRCLECI === "true") {
    return {
      provider: "circleci",
      sha: env.CIRCLE_SHA1 ?? null,
      branch: env.CIRCLE_BRANCH ?? null,
      message: null,
      ciRunUrl: env.CIRCLE_BUILD_URL ?? null,
    }
  }

  // Bitbucket Pipelines
  if (env.BITBUCKET_BUILD_NUMBER) {
    return {
      provider: "bitbucket",
      sha: env.BITBUCKET_COMMIT ?? null,
      branch: env.BITBUCKET_BRANCH ?? null,
      message: null,
      ciRunUrl: null,
    }
  }

  // Generic CI (CI=true set by most providers)
  if (env.CI === "true" || env.CI === "1") {
    return { provider: "generic-ci", sha: null, branch: null, message: null, ciRunUrl: null }
  }

  return { provider: null, sha: null, branch: null, message: null, ciRunUrl: null }
}

export function isCI(): boolean {
  const env = process.env
  return !!(
    env.CI ||
    env.GITHUB_ACTIONS ||
    env.TF_BUILD ||
    env.GITLAB_CI ||
    env.CIRCLECI ||
    env.BITBUCKET_BUILD_NUMBER
  )
}
