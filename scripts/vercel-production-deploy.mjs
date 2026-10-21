import { spawnSync } from 'node:child_process';
import { buildVercelProductionDeployArgs } from './vercel-deploy-args.mjs';

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.error('VERCEL_TOKEN is required.');
  process.exit(1);
}

const commitSha = process.env.VERCEL_DEPLOY_SHA;
const args = [...buildVercelProductionDeployArgs(commitSha), '--token', token];
const result = spawnSync('vercel', args, { stdio: 'inherit' });

if (result.error) {
  console.error(`Unable to start Vercel CLI: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
