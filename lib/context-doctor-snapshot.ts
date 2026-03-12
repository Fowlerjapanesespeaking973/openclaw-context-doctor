export const CONTEXT_DOCTOR_BOOTSTRAP_FILES = [
  'AGENTS.md',
  'SOUL.md',
  'TOOLS.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'BOOTSTRAP.md',
  'MEMORY.md',
] as const;

export const CONTEXT_DOCTOR_EXPECTED_MISSING = new Set<string>(['BOOTSTRAP.md']);
export const MAX_CONTEXT_DOCTOR_CHARS_PER_FILE = 20_000;
export const MAX_CONTEXT_DOCTOR_CHARS_TOTAL = 150_000;
export const DEFAULT_CONTEXT_DOCTOR_CTX_SIZE = 200_000;

const DEFAULT_OVERHEAD = {
  systemPrompt: 3900,
  skillsList: 1000,
  toolSchemas: 4500,
  toolSummaries: 1850,
} as const;

export type WorkspaceSource = 'custom' | 'openclaw' | 'repo' | 'vps';
export type SkillSource = 'workspace' | 'repo' | 'codex' | 'claude' | 'system';
export type ContextDoctorSource = 'local' | 'mock' | 'vps';

interface BuildWorkspaceSnapshotInput {
  id: string;
  agentId: string;
  agentName: string;
  workspaceLabel: string;
  workspaceDescriptor: string;
  workspaceSource: WorkspaceSource;
  scannedAt: string;
  ctxSize: number;
  files: ContextDoctorFileEntry[];
  skills: ContextDoctorSkillEntry[];
  notes: string[];
}

export interface ContextDoctorFileEntry {
  name: string;
  status: 'ok' | 'truncated' | 'missing';
  chars: number;
  tokens: number;
  expectedMissing: boolean;
}

export interface ContextDoctorSkillEntry {
  name: string;
  source: SkillSource;
  chars: number;
  tokens: number;
}

export interface ContextDoctorBudgetSegment {
  key: 'systemPrompt' | 'workspaceFiles' | 'skillsList' | 'toolSchemas' | 'toolSummaries';
  label: string;
  tokens: number;
  percent: number;
}

export interface ContextDoctorWorkspaceSnapshot {
  id: string;
  agentId: string;
  agentName: string;
  workspace: {
    label: string;
    descriptor: string;
    source: WorkspaceSource;
  };
  scannedAt: string;
  ctxSize: number;
  maxCharsPerFile: number;
  maxCharsTotal: number;
  files: ContextDoctorFileEntry[];
  skills: ContextDoctorSkillEntry[];
  totalChars: number;
  totalTokens: number;
  budget: {
    segments: ContextDoctorBudgetSegment[];
    bootstrapTokens: number;
    bootstrapPct: number;
    freeTokens: number;
    freePct: number;
  };
  health: 'healthy' | 'moderate' | 'heavy';
  warnings: {
    truncated: string[];
    missing: string[];
    totalCharsExceeded: boolean;
  };
  notes: string[];
}

export interface ContextDoctorSnapshot {
  source: ContextDoctorSource;
  scannedAt: string;
  publishedAt: string | null;
  activeWorkspaceId: string;
  workspaces: ContextDoctorWorkspaceSnapshot[];
  notes: string[];
  meta: {
    eventId: string | null;
    traceId: string | null;
    title: string | null;
    summary: string | null;
  };
}

export interface ContextDoctorHydrationMeta {
  eventId?: string | null;
  publishedAt?: string | null;
  traceId?: string | null;
  title?: string | null;
  summary?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => stringOrNull(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function isWorkspaceSource(value: string | null): value is WorkspaceSource {
  return value === 'custom' || value === 'openclaw' || value === 'repo' || value === 'vps';
}

function isSkillSource(value: string | null): value is SkillSource {
  return value === 'workspace' || value === 'repo' || value === 'codex' || value === 'claude' || value === 'system';
}

export function estimateContextDoctorTokens(chars: number): number {
  return chars > 0 ? Math.max(1, Math.floor(chars / 4)) : 0;
}

export function normalizeContextDoctorWorkspaceId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function titleCaseAgent(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildContextDoctorWorkspaceDescriptor(source: WorkspaceSource): string {
  if (source === 'openclaw') return 'OpenClaw workspace live scan';
  if (source === 'custom') return 'Custom workspace live scan';
  if (source === 'vps') return 'Published remote workspace snapshot';
  return 'Repo root live scan';
}

export function buildContextDoctorWorkspaceSnapshot(
  input: BuildWorkspaceSnapshotInput,
): ContextDoctorWorkspaceSnapshot {
  const totalChars = input.files.reduce((sum, file) => sum + file.chars, 0);
  const totalTokens = input.files.reduce((sum, file) => sum + file.tokens, 0);

  const segments: ContextDoctorBudgetSegment[] = [
    {
      key: 'systemPrompt',
      label: 'System Prompt',
      tokens: DEFAULT_OVERHEAD.systemPrompt,
      percent: roundPercent((DEFAULT_OVERHEAD.systemPrompt / input.ctxSize) * 100),
    },
    {
      key: 'workspaceFiles',
      label: 'Workspace Files',
      tokens: totalTokens,
      percent: roundPercent((totalTokens / input.ctxSize) * 100),
    },
    {
      key: 'skillsList',
      label: 'Skills List',
      tokens: DEFAULT_OVERHEAD.skillsList,
      percent: roundPercent((DEFAULT_OVERHEAD.skillsList / input.ctxSize) * 100),
    },
    {
      key: 'toolSchemas',
      label: 'Tool Schemas',
      tokens: DEFAULT_OVERHEAD.toolSchemas,
      percent: roundPercent((DEFAULT_OVERHEAD.toolSchemas / input.ctxSize) * 100),
    },
    {
      key: 'toolSummaries',
      label: 'Tool Summaries',
      tokens: DEFAULT_OVERHEAD.toolSummaries,
      percent: roundPercent((DEFAULT_OVERHEAD.toolSummaries / input.ctxSize) * 100),
    },
  ];

  const bootstrapTokens = segments.reduce((sum, segment) => sum + segment.tokens, 0);
  const bootstrapPct = roundPercent((bootstrapTokens / input.ctxSize) * 100);
  const freeTokens = Math.max(0, input.ctxSize - bootstrapTokens);
  const freePct = roundPercent((freeTokens / input.ctxSize) * 100);
  const health = bootstrapPct < 10 ? 'healthy' : bootstrapPct < 15 ? 'moderate' : 'heavy';
  const truncated = input.files.filter((file) => file.status === 'truncated').map((file) => file.name);
  const missing = input.files
    .filter((file) => file.status === 'missing' && !file.expectedMissing)
    .map((file) => file.name);

  return {
    id: input.id,
    agentId: input.agentId,
    agentName: input.agentName,
    workspace: {
      label: input.workspaceLabel,
      descriptor: input.workspaceDescriptor,
      source: input.workspaceSource,
    },
    scannedAt: input.scannedAt,
    ctxSize: input.ctxSize,
    maxCharsPerFile: MAX_CONTEXT_DOCTOR_CHARS_PER_FILE,
    maxCharsTotal: MAX_CONTEXT_DOCTOR_CHARS_TOTAL,
    files: input.files,
    skills: input.skills,
    totalChars,
    totalTokens,
    budget: {
      segments,
      bootstrapTokens,
      bootstrapPct,
      freeTokens,
      freePct,
    },
    health,
    warnings: {
      truncated,
      missing,
      totalCharsExceeded: totalChars > MAX_CONTEXT_DOCTOR_CHARS_TOTAL,
    },
    notes: input.notes,
  };
}

function parseFileEntry(value: unknown): ContextDoctorFileEntry | null {
  if (!isRecord(value)) return null;

  const name = stringOrNull(value.name);
  const status = stringOrNull(value.status);
  const chars = numberOrNull(value.chars);
  const tokens = numberOrNull(value.tokens);
  const expectedMissing = Boolean(value.expectedMissing);

  if (!name || (status !== 'ok' && status !== 'truncated' && status !== 'missing') || chars === null || tokens === null) {
    return null;
  }

  return {
    name,
    status,
    chars,
    tokens,
    expectedMissing,
  };
}

function parseSkillEntry(value: unknown): ContextDoctorSkillEntry | null {
  if (!isRecord(value)) return null;

  const name = stringOrNull(value.name);
  const source = stringOrNull(value.source);
  const chars = numberOrNull(value.chars);
  const tokens = numberOrNull(value.tokens);

  if (!name || !isSkillSource(source) || chars === null || tokens === null) {
    return null;
  }

  return {
    name,
    source,
    chars,
    tokens,
  };
}

function parseWorkspacePayload(value: unknown, fallbackScannedAt: string): ContextDoctorWorkspaceSnapshot | null {
  if (!isRecord(value)) return null;

  const rawId = stringOrNull(value.id) ?? stringOrNull(value.agentId);
  if (!rawId) return null;

  const agentId = stringOrNull(value.agentId) ?? rawId;
  const agentName = stringOrNull(value.agentName) ?? titleCaseAgent(agentId);
  const scannedAt = stringOrNull(value.scannedAt) ?? fallbackScannedAt;
  const ctxSize = numberOrNull(value.ctxSize) ?? DEFAULT_CONTEXT_DOCTOR_CTX_SIZE;
  const workspaceMeta = isRecord(value.workspace) ? value.workspace : null;
  const workspaceLabel = stringOrNull(workspaceMeta?.label) ?? agentName;
  const workspaceSourceValue = stringOrNull(workspaceMeta?.source);
  const workspaceSource = isWorkspaceSource(workspaceSourceValue) ? workspaceSourceValue : 'custom';
  const workspaceDescriptor =
    stringOrNull(workspaceMeta?.descriptor) ?? buildContextDoctorWorkspaceDescriptor(workspaceSource);
  const files = (Array.isArray(value.files) ? value.files : [])
    .map((entry) => parseFileEntry(entry))
    .filter((entry): entry is ContextDoctorFileEntry => Boolean(entry));
  const skills = (Array.isArray(value.skills) ? value.skills : [])
    .map((entry) => parseSkillEntry(entry))
    .filter((entry): entry is ContextDoctorSkillEntry => Boolean(entry));
  const notes = stringArray(value.notes);

  return buildContextDoctorWorkspaceSnapshot({
    id: normalizeContextDoctorWorkspaceId(rawId),
    agentId: normalizeContextDoctorWorkspaceId(agentId),
    agentName,
    workspaceLabel,
    workspaceDescriptor,
    workspaceSource,
    scannedAt,
    ctxSize,
    files,
    skills,
    notes,
  });
}

export function hydrateContextDoctorSnapshotFromPayload(
  payload: unknown,
  meta: ContextDoctorHydrationMeta = {},
): ContextDoctorSnapshot | null {
  if (!isRecord(payload)) return null;

  const format = stringOrNull(payload.format);
  if (format && !format.startsWith('context_doctor.')) return null;

  const scannedAt = stringOrNull(payload.scannedAt) ?? new Date().toISOString();
  const workspaces = (Array.isArray(payload.workspaces) ? payload.workspaces : [])
    .map((entry) => parseWorkspacePayload(entry, scannedAt))
    .filter((entry): entry is ContextDoctorWorkspaceSnapshot => Boolean(entry));

  if (workspaces.length === 0) return null;

  const rawActiveWorkspaceId = stringOrNull(payload.activeWorkspaceId);
  const activeWorkspaceId = rawActiveWorkspaceId
    ? normalizeContextDoctorWorkspaceId(rawActiveWorkspaceId)
    : workspaces[0]?.id ?? '';
  const activeWorkspaceExists = workspaces.some((workspace) => workspace.id === activeWorkspaceId);
  const sourceValue = stringOrNull(payload.source);
  const source: ContextDoctorSource =
    sourceValue === 'local' || sourceValue === 'mock' || sourceValue === 'vps'
      ? sourceValue
      : 'vps';

  return {
    source,
    scannedAt,
    publishedAt: stringOrNull(meta.publishedAt) ?? null,
    activeWorkspaceId: activeWorkspaceExists ? activeWorkspaceId : workspaces[0]?.id ?? '',
    workspaces,
    notes: stringArray(payload.notes),
    meta: {
      eventId: stringOrNull(meta.eventId) ?? null,
      traceId: stringOrNull(meta.traceId) ?? null,
      title: stringOrNull(meta.title) ?? null,
      summary: stringOrNull(meta.summary) ?? null,
    },
  };
}
