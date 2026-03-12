import fs from 'node:fs/promises';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchContextDoctorSnapshot } from '@/lib/context-doctor';
import {
  getAllowedRootsFromEnv,
  getDefaultCtxSizeFromEnv,
  getDefaultWorkspaceFromEnv,
  isPathWithinAllowedRoots,
} from '@/lib/context-doctor-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ScanRequestBody {
  workspacePath?: unknown;
  ctxSize?: unknown;
}

function parseCtxSize(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

export async function POST(request: NextRequest) {
  let body: ScanRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const requestWorkspace = typeof body.workspacePath === 'string' && body.workspacePath.trim()
    ? path.resolve(body.workspacePath.trim())
    : null;
  const workspacePath = requestWorkspace ?? getDefaultWorkspaceFromEnv();
  if (!workspacePath) {
    return NextResponse.json(
      { error: 'Missing workspacePath. Provide one in the request body or configure CONTEXT_DOCTOR_WORKSPACE.' },
      { status: 400 },
    );
  }

  const allowedRoots = getAllowedRootsFromEnv();
  if (allowedRoots.length === 0) {
    return NextResponse.json(
      { error: 'Local Scan is disabled until CONTEXT_DOCTOR_ALLOWED_ROOTS is configured.' },
      { status: 400 },
    );
  }

  if (!isPathWithinAllowedRoots(workspacePath, allowedRoots)) {
    return NextResponse.json(
      { error: `Workspace path must stay inside CONTEXT_DOCTOR_ALLOWED_ROOTS. Received: ${workspacePath}` },
      { status: 403 },
    );
  }

  try {
    const stat = await fs.stat(workspacePath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: `Workspace path is not a directory: ${workspacePath}` }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: `Workspace path was not found: ${workspacePath}` }, { status: 404 });
    }
    throw error;
  }

  const explicitCtxSize = parseCtxSize(body.ctxSize);
  if (body.ctxSize !== undefined && body.ctxSize !== null && explicitCtxSize === null) {
    return NextResponse.json({ error: 'ctxSize must be a positive integer.' }, { status: 400 });
  }
  const ctxSize = explicitCtxSize ?? getDefaultCtxSizeFromEnv() ?? undefined;

  try {
    const snapshot = await fetchContextDoctorSnapshot({
      workspacePath,
      repoRoot: workspacePath,
      ctxSize,
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    throw error;
  }
}
