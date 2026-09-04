import { rm } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const configuredDirectory = process.env.NEXT_DIST_DIR || '.next';
const buildDirectory = path.resolve(workspaceRoot, configuredDirectory);

if (
  path.dirname(buildDirectory) !== workspaceRoot ||
  !path.basename(buildDirectory).startsWith('.next')
) {
  throw new Error(
    `Refusing to clean unsafe Next.js build directory: ${configuredDirectory}`,
  );
}

await rm(buildDirectory, { recursive: true, force: true });
