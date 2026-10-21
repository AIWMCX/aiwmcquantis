import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const helperPath = resolve(process.cwd(), 'scripts/vercel-deploy-args.mjs');
const helperUrl = pathToFileURL(helperPath).href;

describe('Vercel production deploy commit metadata', () => {
  it('passes the triggering commit SHA into the actual production deploy step', () => {
    const workflow = parse(
      readFileSync(resolve(process.cwd(), '.github/workflows/vercel-production-deploy.yml'), 'utf8')
    ) as {
      jobs: {
        deploy: { steps: Array<{ name: string; env?: Record<string, string>; run?: string }> };
      };
    };
    const deployStep = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Deploy to Vercel production'
    );

    expect(deployStep?.env?.VERCEL_DEPLOY_SHA).toBe(
      "${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha || github.sha }}"
    );
    expect(deployStep?.run).toContain('scripts/vercel-production-deploy.mjs');
  });

  it('tags the deployment with its exact Git commit SHA for reuse by the release pipeline', async () => {
    expect(existsSync(helperPath)).toBe(true);
    const sha = 'a0bc5dfb2779ca604672cb2e0272b05370c08c87';
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { buildVercelProductionDeployArgs } from ${JSON.stringify(helperUrl)}; console.log(JSON.stringify(buildVercelProductionDeployArgs(${JSON.stringify(sha)})));`,
      ],
      { encoding: 'utf8' }
    );
    expect(JSON.parse(output)).toEqual([
      'deploy',
      '--prebuilt',
      '--prod',
      '--archive=tgz',
      '--meta',
      `githubCommitSha=${sha}`,
    ]);
  });

  it('rejects a missing or malformed SHA instead of publishing an untraceable deployment', async () => {
    expect(existsSync(helperPath)).toBe(true);
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { buildVercelProductionDeployArgs } from ${JSON.stringify(helperUrl)}; buildVercelProductionDeployArgs('not-a-sha');`,
      ],
      { encoding: 'utf8' }
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/40-character Git commit SHA/);
  });
});
