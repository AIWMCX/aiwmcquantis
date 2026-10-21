const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function buildVercelProductionDeployArgs(commitSha) {
  if (typeof commitSha !== 'string' || !COMMIT_SHA_PATTERN.test(commitSha)) {
    throw new Error('A 40-character Git commit SHA is required for Vercel deployment metadata.');
  }

  return [
    'deploy',
    '--prebuilt',
    '--prod',
    '--archive=tgz',
    '--meta',
    `githubCommitSha=${commitSha}`,
  ];
}
