import test from 'node:test';
import assert from 'node:assert/strict';
import { runTsxEvalJson } from '../scripts/test-support/run-tsx-eval.js';

test('fetchContextDoctorSnapshot scans workspace files and installed skills from the live filesystem', () => {
  const result = runTsxEvalJson(`
    import fs from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';
    import { fetchContextDoctorSnapshot } from './lib/context-doctor.ts';

    const run = async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-doctor-'));
      const workspace = path.join(root, 'workspace');
      const codexSkills = path.join(root, 'codex-skills');
      const claudeSkills = path.join(root, 'claude-skills');

      await fs.mkdir(workspace, { recursive: true });
      await fs.mkdir(path.join(codexSkills, 'tool-alpha'), { recursive: true });
      await fs.mkdir(path.join(claudeSkills, 'tool-beta'), { recursive: true });

      await fs.writeFile(path.join(workspace, 'AGENTS.md'), 'a'.repeat(1200));
      await fs.writeFile(path.join(workspace, 'TOOLS.md'), 'b'.repeat(21050));
      await fs.symlink(path.join(workspace, 'missing-target.md'), path.join(workspace, 'SOUL.md'));
      await fs.writeFile(path.join(codexSkills, 'tool-alpha', 'SKILL.md'), '# Alpha\\n'.repeat(40));
      await fs.writeFile(path.join(claudeSkills, 'tool-beta', 'SKILL.md'), '# Beta\\n'.repeat(20));

      const snapshot = await fetchContextDoctorSnapshot({
        workspacePath: workspace,
        repoRoot: workspace,
        homeDir: root,
        scannedAt: '2026-03-09T12:00:00.000Z',
        skillDirCandidates: [
          { source: 'workspace', path: path.join(workspace, 'skills') },
          { source: 'codex', path: codexSkills },
          { source: 'claude', path: claudeSkills },
        ],
      });

      const active = snapshot.workspaces[0];
      const summary = {
        source: snapshot.source,
        workspaceSource: active.workspace.source,
        files: Object.fromEntries(active.files.map((file) => [file.name, { status: file.status, chars: file.chars }])),
        warnings: active.warnings,
        skillNames: active.skills.map((skill) => skill.name),
        health: active.health,
      };

      await fs.rm(root, { recursive: true, force: true });
      return summary;
    };

    run().then((summary) => {
      console.log(JSON.stringify(summary));
    });
  `);

  assert.equal(result.source, 'local');
  assert.equal(result.workspaceSource, 'custom');
  assert.deepEqual(result.files['AGENTS.md'], { status: 'ok', chars: 1200 });
  assert.deepEqual(result.files['TOOLS.md'], { status: 'truncated', chars: 21050 });
  assert.deepEqual(result.files['SOUL.md'], { status: 'missing', chars: 0 });
  assert.deepEqual(result.warnings.truncated, ['TOOLS.md']);
  assert.ok(result.warnings.missing.includes('SOUL.md'));
  assert.deepEqual(result.skillNames, ['tool-alpha', 'tool-beta']);
  assert.equal(result.health, 'healthy');
});

test('fetchContextDoctorSnapshot falls back to repo mode when no OpenClaw workspace is detected', () => {
  const result = runTsxEvalJson(`
    import fs from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';
    import { fetchContextDoctorSnapshot } from './lib/context-doctor.ts';

    const run = async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-doctor-repo-'));
      const repoRoot = path.join(root, 'repo');
      await fs.mkdir(repoRoot, { recursive: true });
      await fs.writeFile(path.join(repoRoot, 'AGENTS.md'), 'repo instructions');

      const snapshot = await fetchContextDoctorSnapshot({
        repoRoot,
        homeDir: root,
        scannedAt: '2026-03-09T12:05:00.000Z',
        skillDirCandidates: [],
      });

      const active = snapshot.workspaces[0];
      const result = {
        source: snapshot.source,
        workspaceSource: active.workspace.source,
        workspaceLabel: active.workspace.label,
        notes: active.notes,
        missing: active.warnings.missing,
      };

      await fs.rm(root, { recursive: true, force: true });
      return result;
    };

    run().then((summary) => {
      console.log(JSON.stringify(summary));
    });
  `);

  assert.equal(result.source, 'local');
  assert.equal(result.workspaceSource, 'repo');
  assert.equal(result.workspaceLabel, 'repo');
  assert.ok(result.notes.some((note) => note.includes('not a full OpenClaw workspace')));
  assert.ok(result.missing.includes('SOUL.md'));
});

test('hydrateContextDoctorSnapshotFromPayload parses a multi-workspace payload', () => {
  const result = runTsxEvalJson(`
    import { hydrateContextDoctorSnapshotFromPayload } from './lib/context-doctor-snapshot.ts';

    const snapshot = hydrateContextDoctorSnapshotFromPayload({
      format: 'context_doctor.snapshot.v1',
      source: 'vps',
      scannedAt: '2026-03-09T13:00:00.000Z',
      activeWorkspaceId: 'nexus',
      notes: ['Published export'],
      workspaces: [
        {
          id: 'nexus',
          agentId: 'nexus',
          agentName: 'Nexus',
          scannedAt: '2026-03-09T13:00:00.000Z',
          ctxSize: 200000,
          workspace: { label: 'Nexus', descriptor: 'Published remote workspace snapshot', source: 'vps' },
          files: [
            { name: 'AGENTS.md', status: 'ok', chars: 8000, tokens: 2000, expectedMissing: false },
            { name: 'TOOLS.md', status: 'truncated', chars: 24000, tokens: 6000, expectedMissing: false },
            { name: 'SOUL.md', status: 'missing', chars: 0, tokens: 0, expectedMissing: false }
          ],
          skills: [
            { name: 'tool-alpha', source: 'codex', chars: 800, tokens: 200 }
          ],
          notes: ['Workspace files scanned remotely.']
        },
        {
          id: 'guide',
          agentId: 'guide',
          agentName: 'Guide',
          scannedAt: '2026-03-09T13:00:00.000Z',
          ctxSize: 200000,
          workspace: { label: 'Guide', descriptor: 'Published remote workspace snapshot', source: 'vps' },
          files: [
            { name: 'AGENTS.md', status: 'ok', chars: 3000, tokens: 750, expectedMissing: false }
          ],
          skills: [],
          notes: ['Guide is clean.']
        }
      ]
    }, {
      eventId: 'evt_123',
      publishedAt: '2026-03-09T13:05:00.000Z',
      traceId: 'trace_123',
      title: 'Context snapshot',
      summary: 'Two workspaces exported.'
    });

    if (!snapshot) {
      throw new Error('snapshot should not be null');
    }

    console.log(JSON.stringify({
      source: snapshot.source,
      publishedAt: snapshot.publishedAt,
      workspaceIds: snapshot.workspaces.map((workspace) => workspace.id),
      activeWorkspaceId: snapshot.activeWorkspaceId,
      nexusWarnings: snapshot.workspaces.find((workspace) => workspace.id === 'nexus')?.warnings,
      summary: snapshot.meta.summary
    }));
  `);

  assert.equal(result.source, 'vps');
  assert.equal(result.publishedAt, '2026-03-09T13:05:00.000Z');
  assert.deepEqual(result.workspaceIds, ['nexus', 'guide']);
  assert.equal(result.activeWorkspaceId, 'nexus');
  assert.deepEqual(result.nexusWarnings, {
    truncated: ['TOOLS.md'],
    missing: ['SOUL.md'],
    totalCharsExceeded: false,
  });
  assert.equal(result.summary, 'Two workspaces exported.');
});
