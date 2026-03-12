import {
  buildContextDoctorWorkspaceDescriptor,
  buildContextDoctorWorkspaceSnapshot,
  DEFAULT_CONTEXT_DOCTOR_CTX_SIZE,
  estimateContextDoctorTokens,
  type ContextDoctorFileEntry,
  type ContextDoctorSkillEntry,
  type ContextDoctorSnapshot,
  type WorkspaceSource,
} from '@/lib/context-doctor-snapshot';

function createFileEntry(
  name: string,
  status: ContextDoctorFileEntry['status'],
  chars: number,
  expectedMissing = false,
): ContextDoctorFileEntry {
  return {
    name,
    status,
    chars,
    tokens: estimateContextDoctorTokens(chars),
    expectedMissing,
  };
}

function createSkillEntry(
  name: string,
  source: ContextDoctorSkillEntry['source'],
  chars: number,
): ContextDoctorSkillEntry {
  return {
    name,
    source,
    chars,
    tokens: estimateContextDoctorTokens(chars),
  };
}

function createWorkspace(options: {
  id: string;
  agentName: string;
  label: string;
  source: WorkspaceSource;
  scannedAt: string;
  files: ContextDoctorFileEntry[];
  skills: ContextDoctorSkillEntry[];
  notes: string[];
}) {
  return buildContextDoctorWorkspaceSnapshot({
    id: options.id,
    agentId: options.id,
    agentName: options.agentName,
    workspaceLabel: options.label,
    workspaceDescriptor: buildContextDoctorWorkspaceDescriptor(options.source),
    workspaceSource: options.source,
    scannedAt: options.scannedAt,
    ctxSize: DEFAULT_CONTEXT_DOCTOR_CTX_SIZE,
    files: options.files,
    skills: options.skills,
    notes: options.notes,
  });
}

export function buildMockContextDoctorSnapshot(): ContextDoctorSnapshot {
  const scannedAt = '2026-03-12T11:00:00.000Z';
  const healthyWorkspace = createWorkspace({
    id: 'builder-laptop',
    agentName: 'Builder Laptop',
    label: 'Builder Laptop',
    source: 'custom',
    scannedAt,
    files: [
      createFileEntry('AGENTS.md', 'ok', 7_800),
      createFileEntry('SOUL.md', 'ok', 2_400),
      createFileEntry('TOOLS.md', 'ok', 9_200),
      createFileEntry('IDENTITY.md', 'ok', 1_700),
      createFileEntry('USER.md', 'ok', 1_200),
      createFileEntry('HEARTBEAT.md', 'ok', 1_000),
      createFileEntry('BOOTSTRAP.md', 'missing', 0, true),
      createFileEntry('MEMORY.md', 'ok', 2_200),
    ],
    skills: [
      createSkillEntry('tool-context7', 'codex', 1_440),
      createSkillEntry('workflow-feature-shipper', 'codex', 1_180),
      createSkillEntry('agent-browser', 'workspace', 820),
      createSkillEntry('tool-systematic-debugging', 'claude', 960),
    ],
    notes: [
      'Healthy workspace: bootstrap overhead is low and all primary guidance files are present.',
    ],
  });

  const warningWorkspace = createWorkspace({
    id: 'support-vps',
    agentName: 'Support VPS',
    label: 'Support VPS',
    source: 'openclaw',
    scannedAt,
    files: [
      createFileEntry('AGENTS.md', 'ok', 9_800),
      createFileEntry('SOUL.md', 'missing', 0),
      createFileEntry('TOOLS.md', 'truncated', 26_200),
      createFileEntry('IDENTITY.md', 'ok', 2_200),
      createFileEntry('USER.md', 'missing', 0),
      createFileEntry('HEARTBEAT.md', 'ok', 4_900),
      createFileEntry('BOOTSTRAP.md', 'missing', 0, true),
      createFileEntry('MEMORY.md', 'ok', 6_200),
    ],
    skills: [
      createSkillEntry('review-quality', 'codex', 1_620),
      createSkillEntry('tool-better-auth', 'codex', 1_420),
      createSkillEntry('tool-ai-sdk', 'repo', 900),
      createSkillEntry('skill-improver', 'system', 1_260),
    ],
    notes: [
      'Warning workspace: one oversized file will be truncated and two guidance files are currently missing.',
    ],
  });

  return {
    source: 'mock',
    scannedAt,
    publishedAt: null,
    activeWorkspaceId: healthyWorkspace.id,
    workspaces: [healthyWorkspace, warningWorkspace],
    notes: [
      'This is a bundled demo snapshot for the standalone OpenClaw Context Doctor app.',
      'Switch to Local Scan to inspect a real workspace on your own machine.',
    ],
    meta: {
      eventId: null,
      traceId: null,
      title: 'Bundled demo snapshot',
      summary: 'Two workspaces show a healthy scan and a warning-heavy scan side by side.',
    },
  };
}
