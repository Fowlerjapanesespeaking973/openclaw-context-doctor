import path from 'node:path';

function parseInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getAllowedRootsFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.CONTEXT_DOCTOR_ALLOWED_ROOTS;
  if (!raw) return [];

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

export function getDefaultWorkspaceFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  const workspace = env.CONTEXT_DOCTOR_WORKSPACE?.trim();
  return workspace ? path.resolve(workspace) : null;
}

export function getDefaultCtxSizeFromEnv(env: NodeJS.ProcessEnv = process.env): number | null {
  return parseInteger(env.CONTEXT_DOCTOR_CTX_SIZE);
}

export function isPathWithinAllowedRoots(targetPath: string, allowedRoots: string[]): boolean {
  const resolvedTarget = path.resolve(targetPath);
  return allowedRoots.some((root) => {
    const relativePath = path.relative(root, resolvedTarget);
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  });
}
