import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildContextDoctorWorkspaceDescriptor,
  buildContextDoctorWorkspaceSnapshot,
  CONTEXT_DOCTOR_BOOTSTRAP_FILES,
  CONTEXT_DOCTOR_EXPECTED_MISSING,
  DEFAULT_CONTEXT_DOCTOR_CTX_SIZE,
  estimateContextDoctorTokens,
  MAX_CONTEXT_DOCTOR_CHARS_PER_FILE,
  type ContextDoctorFileEntry,
  type ContextDoctorSkillEntry,
  type ContextDoctorSnapshot,
  type SkillSource,
  type WorkspaceSource,
} from '@/lib/context-doctor-snapshot';

interface WorkspaceCandidate {
  path: string;
  source: Exclude<WorkspaceSource, 'vps'>;
}

export interface ContextDoctorRuntimeOptions {
  ctxSize?: number;
  homeDir?: string;
  repoRoot?: string;
  scannedAt?: string;
  workspacePath?: string;
  skillDirCandidates?: Array<{
    source: SkillSource;
    path: string;
  }>;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error) && typeof error === 'object' && error !== null && 'code' in error;
}

function isMissingPathError(error: unknown) {
  return isNodeError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function isOptionalDirectoryError(error: unknown) {
  return isNodeError(error) && (
    error.code === 'ENOENT'
    || error.code === 'ENOTDIR'
    || error.code === 'EACCES'
    || error.code === 'EPERM'
  );
}

function buildWorkspaceLabel(workspacePath: string): string {
  const basename = path.basename(workspacePath);
  return basename || workspacePath;
}

function uniqueSkillCandidates(candidates: Array<{ source: SkillSource; path: string }>) {
  const seen = new Set<string>();
  const result: Array<{ source: SkillSource; path: string }> = [];

  for (const candidate of candidates) {
    const resolvedPath = path.resolve(candidate.path);
    if (seen.has(resolvedPath)) continue;
    seen.add(resolvedPath);
    result.push({ source: candidate.source, path: resolvedPath });
  }

  return result;
}

function buildDefaultSkillDirCandidates(workspacePath: string, repoRoot: string, homeDir: string) {
  return uniqueSkillCandidates([
    { source: 'workspace', path: path.join(workspacePath, 'skills') },
    { source: 'repo', path: path.join(repoRoot, 'skills') },
    { source: 'codex', path: path.join(homeDir, '.codex', 'skills') },
    { source: 'claude', path: path.join(homeDir, '.claude', 'skills') },
    { source: 'system', path: '/opt/homebrew/lib/node_modules/openclaw/skills' },
    { source: 'system', path: '/usr/local/lib/node_modules/openclaw/skills' },
    { source: 'system', path: '/usr/lib/node_modules/openclaw/skills' },
  ]);
}

async function statIfExists(targetPath: string) {
  try {
    return await fs.lstat(targetPath);
  } catch (error) {
    if (isMissingPathError(error)) return null;
    throw error;
  }
}

async function directoryExists(targetPath: string): Promise<boolean> {
  const stat = await statIfExists(targetPath);
  return Boolean(stat?.isDirectory());
}

async function countChars(targetPath: string): Promise<number> {
  const contents = await fs.readFile(targetPath, 'utf8');
  return contents.length;
}

async function hasWorkspaceSignals(targetPath: string): Promise<boolean> {
  const [hasBootstrapFile, hasSkillsDir] = await Promise.all([
    Promise.all(
      CONTEXT_DOCTOR_BOOTSTRAP_FILES.map(async (fileName) => Boolean(await statIfExists(path.join(targetPath, fileName)))),
    ).then((rows) => rows.some(Boolean)),
    directoryExists(path.join(targetPath, 'skills')),
  ]);

  return hasBootstrapFile || hasSkillsDir;
}

async function resolveWorkspace(options: ContextDoctorRuntimeOptions): Promise<WorkspaceCandidate> {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const homeDir = path.resolve(options.homeDir ?? os.homedir());
  const envWorkspace = process.env.CONTEXT_DOCTOR_WORKSPACE ?? process.env.OPENCLAW_WORKSPACE;

  const explicitCandidates = [options.workspacePath, envWorkspace]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => ({ path: path.resolve(value), source: 'custom' as const }));

  for (const candidate of explicitCandidates) {
    if (await directoryExists(candidate.path)) return candidate;
  }

  const openclawWorkspace = path.join(homeDir, '.openclaw', 'workspace');
  if (await directoryExists(openclawWorkspace) && await hasWorkspaceSignals(openclawWorkspace)) {
    return { path: openclawWorkspace, source: 'openclaw' };
  }

  return { path: repoRoot, source: 'repo' };
}

async function scanWorkspaceFiles(workspacePath: string): Promise<ContextDoctorFileEntry[]> {
  return Promise.all(
    CONTEXT_DOCTOR_BOOTSTRAP_FILES.map(async (fileName) => {
      const filePath = path.join(workspacePath, fileName);
      const stat = await statIfExists(filePath);
      const expectedMissing = CONTEXT_DOCTOR_EXPECTED_MISSING.has(fileName);

      if (!stat) {
        return { name: fileName, status: 'missing', chars: 0, tokens: 0, expectedMissing };
      }

      if (stat.isSymbolicLink()) {
        try {
          await fs.realpath(filePath);
        } catch (error) {
          if (isMissingPathError(error)) {
            return { name: fileName, status: 'missing', chars: 0, tokens: 0, expectedMissing };
          }
          throw error;
        }
      }

      if (!stat.isFile() && !stat.isSymbolicLink()) {
        return { name: fileName, status: 'missing', chars: 0, tokens: 0, expectedMissing };
      }

      const chars = await countChars(filePath);
      if (chars <= 0) {
        return { name: fileName, status: 'missing', chars: 0, tokens: 0, expectedMissing };
      }

      const tokens = estimateContextDoctorTokens(chars);
      const status = chars >= MAX_CONTEXT_DOCTOR_CHARS_PER_FILE ? 'truncated' : 'ok';
      return { name: fileName, status, chars, tokens, expectedMissing };
    }),
  );
}

async function scanSkills(skillDirCandidates: Array<{ source: SkillSource; path: string }>): Promise<ContextDoctorSkillEntry[]> {
  const skills: ContextDoctorSkillEntry[] = [];
  const seen = new Set<string>();

  for (const candidate of skillDirCandidates) {
    if (!await directoryExists(candidate.path)) continue;

    let directoryEntries: string[] = [];
    try {
      directoryEntries = await fs.readdir(candidate.path);
    } catch (error) {
      if (isOptionalDirectoryError(error)) continue;
      throw error;
    }

    for (const skillName of directoryEntries.sort((left, right) => left.localeCompare(right))) {
      if (seen.has(skillName)) continue;

      const skillPath = path.join(candidate.path, skillName, 'SKILL.md');
      const stat = await statIfExists(skillPath);
      if (!stat?.isFile()) continue;

      const chars = await countChars(skillPath);
      const tokens = estimateContextDoctorTokens(chars);
      skills.push({
        name: skillName,
        source: candidate.source,
        chars,
        tokens,
      });
      seen.add(skillName);
    }
  }

  return skills.sort((left, right) => right.chars - left.chars || left.name.localeCompare(right.name));
}

export async function fetchContextDoctorSnapshot(
  options: ContextDoctorRuntimeOptions = {},
): Promise<ContextDoctorSnapshot> {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const homeDir = path.resolve(options.homeDir ?? os.homedir());
  const ctxSize = options.ctxSize ?? DEFAULT_CONTEXT_DOCTOR_CTX_SIZE;
  const workspace = await resolveWorkspace({
    ...options,
    repoRoot,
    homeDir,
  });

  const skillDirCandidates = options.skillDirCandidates
    ? uniqueSkillCandidates(options.skillDirCandidates)
    : buildDefaultSkillDirCandidates(workspace.path, repoRoot, homeDir);

  const [files, skills] = await Promise.all([
    scanWorkspaceFiles(workspace.path),
    scanSkills(skillDirCandidates),
  ]);

  const workspaceId = buildWorkspaceLabel(workspace.path).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const workspaceSnapshot = buildContextDoctorWorkspaceSnapshot({
    id: workspaceId,
    agentId: workspaceId,
    agentName: buildWorkspaceLabel(workspace.path),
    workspaceLabel: buildWorkspaceLabel(workspace.path),
    workspaceDescriptor: buildContextDoctorWorkspaceDescriptor(workspace.source),
    workspaceSource: workspace.source,
    scannedAt: options.scannedAt ?? new Date().toISOString(),
    ctxSize,
    files,
    skills,
    notes: [
      'Workspace files and installed skills are scanned live from the current server runtime.',
      'Framework, tool-schema, and tool-summary overhead are calibrated estimates.',
      ...(workspace.source === 'repo'
        ? ['This environment is not a full OpenClaw workspace, so missing standard bootstrap files are informational.']
        : []),
    ],
  });

  return {
    source: 'local',
    scannedAt: workspaceSnapshot.scannedAt,
    publishedAt: null,
    activeWorkspaceId: workspaceSnapshot.id,
    workspaces: [workspaceSnapshot],
    notes: [
      'Local Scan mode reads the real filesystem from this server runtime.',
    ],
    meta: {
      eventId: null,
      traceId: null,
      title: null,
      summary: null,
    },
  };
}
