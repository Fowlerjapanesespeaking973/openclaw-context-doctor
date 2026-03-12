import test from 'node:test';
import assert from 'node:assert/strict';
import { runTsxEvalJson } from '../scripts/test-support/run-tsx-eval.js';

test('mock route returns a valid multi-workspace snapshot', () => {
  const result = runTsxEvalJson(`
    const run = async () => {
      const { GET } = await import('./app/api/context-doctor/mock/route.ts');
      const response = await GET();
      const body = await response.json();

      return {
        status: response.status,
        source: body.source,
        workspaceCount: body.workspaces.length,
        activeWorkspaceId: body.activeWorkspaceId,
      };
    };

    run().then((summary) => console.log(JSON.stringify(summary)));
  `);

  assert.equal(result.status, 200);
  assert.equal(result.source, 'mock');
  assert.ok(result.workspaceCount >= 2);
  assert.equal(typeof result.activeWorkspaceId, 'string');
});

test('scan route returns a live snapshot for an allowed path', () => {
  const result = runTsxEvalJson(`
    import fs from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';
    import { NextRequest } from 'next/server';

    const run = async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-doctor-api-'));
      const workspace = path.join(root, 'workspace');
      await fs.mkdir(workspace, { recursive: true });
      await fs.writeFile(path.join(workspace, 'AGENTS.md'), 'hello world');

      process.env.CONTEXT_DOCTOR_ALLOWED_ROOTS = root;
      delete process.env.CONTEXT_DOCTOR_WORKSPACE;
      delete process.env.CONTEXT_DOCTOR_CTX_SIZE;

      const { POST } = await import('./app/api/context-doctor/scan/route.ts');
      const request = new NextRequest('http://localhost/api/context-doctor/scan', {
        method: 'POST',
        body: JSON.stringify({ workspacePath: workspace }),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      await fs.rm(root, { recursive: true, force: true });

      return {
        status: response.status,
        source: body.source,
        workspaceSource: body.workspaces?.[0]?.workspace?.source,
        workspaceLabel: body.workspaces?.[0]?.workspace?.label,
      };
    };

    run().then((summary) => console.log(JSON.stringify(summary)));
  `);

  assert.equal(result.status, 200);
  assert.equal(result.source, 'local');
  assert.equal(result.workspaceSource, 'custom');
  assert.equal(result.workspaceLabel, 'workspace');
});

test('scan route rejects a disallowed path', () => {
  const result = runTsxEvalJson(`
    import fs from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';
    import { NextRequest } from 'next/server';

    const run = async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-doctor-api-deny-'));
      const safeRoot = path.join(root, 'safe');
      const blockedRoot = path.join(root, 'blocked');
      await fs.mkdir(safeRoot, { recursive: true });
      await fs.mkdir(blockedRoot, { recursive: true });
      await fs.writeFile(path.join(blockedRoot, 'AGENTS.md'), 'hello world');

      process.env.CONTEXT_DOCTOR_ALLOWED_ROOTS = safeRoot;
      delete process.env.CONTEXT_DOCTOR_WORKSPACE;

      const { POST } = await import('./app/api/context-doctor/scan/route.ts');
      const request = new NextRequest('http://localhost/api/context-doctor/scan', {
        method: 'POST',
        body: JSON.stringify({ workspacePath: blockedRoot }),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      await fs.rm(root, { recursive: true, force: true });

      return {
        status: response.status,
        error: body.error,
      };
    };

    run().then((summary) => console.log(JSON.stringify(summary)));
  `);

  assert.equal(result.status, 403);
  assert.match(result.error, /CONTEXT_DOCTOR_ALLOWED_ROOTS/);
});

test('scan route returns a clear error when no request path or default workspace is present', () => {
  const result = runTsxEvalJson(`
    import fs from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';
    import { NextRequest } from 'next/server';

    const run = async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-doctor-api-missing-'));

      process.env.CONTEXT_DOCTOR_ALLOWED_ROOTS = root;
      delete process.env.CONTEXT_DOCTOR_WORKSPACE;

      const { POST } = await import('./app/api/context-doctor/scan/route.ts');
      const request = new NextRequest('http://localhost/api/context-doctor/scan', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      await fs.rm(root, { recursive: true, force: true });

      return {
        status: response.status,
        error: body.error,
      };
    };

    run().then((summary) => console.log(JSON.stringify(summary)));
  `);

  assert.equal(result.status, 400);
  assert.match(result.error, /workspacePath/);
});

test('scan route rejects an invalid explicit ctxSize even when env defaults exist', () => {
  const result = runTsxEvalJson(`
    import fs from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';
    import { NextRequest } from 'next/server';

    const run = async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-doctor-api-ctx-'));
      const workspace = path.join(root, 'workspace');
      await fs.mkdir(workspace, { recursive: true });
      await fs.writeFile(path.join(workspace, 'AGENTS.md'), 'hello world');

      process.env.CONTEXT_DOCTOR_ALLOWED_ROOTS = root;
      process.env.CONTEXT_DOCTOR_CTX_SIZE = '200000';

      const { POST } = await import('./app/api/context-doctor/scan/route.ts');
      const request = new NextRequest('http://localhost/api/context-doctor/scan', {
        method: 'POST',
        body: JSON.stringify({ workspacePath: workspace, ctxSize: 'bad-value' }),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      await fs.rm(root, { recursive: true, force: true });

      return {
        status: response.status,
        error: body.error,
      };
    };

    run().then((summary) => console.log(JSON.stringify(summary)));
  `);

  assert.equal(result.status, 400);
  assert.match(result.error, /ctxSize/);
});
