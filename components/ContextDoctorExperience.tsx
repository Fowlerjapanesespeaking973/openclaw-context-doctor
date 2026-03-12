'use client';

import { useState } from 'react';
import { ArrowRight, Database, FolderSync, TerminalSquare } from 'lucide-react';
import { ContextDoctorDemo } from '@/components/ContextDoctorDemo';
import type { ContextDoctorSnapshot } from '@/lib/context-doctor-snapshot';
import { cn } from '@/lib/utils';

interface ContextDoctorExperienceProps {
  initialSnapshot: ContextDoctorSnapshot;
  defaultWorkspacePath: string;
  allowedRoots: string[];
}

type DataMode = 'mock' | 'local';

async function readJsonResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    const error = typeof payload?.error === 'string' ? payload.error : 'Request failed.';
    throw new Error(error);
  }

  return payload as ContextDoctorSnapshot;
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div className="cyber-chamfer-sm border border-border bg-card p-4">
      <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">{title}</p>
      <pre className="mt-3 overflow-x-auto border border-border bg-background px-4 py-3 text-xs leading-6 text-accent">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StepCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  seed: string;
}) {
  return (
    <div className="cyber-chamfer-sm border border-border bg-card p-4 transition-colors duration-150 hover:border-accent/30">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center border border-accent/30 bg-background text-accent">
          {icon}
        </span>
        <p className="font-heading text-base font-bold uppercase tracking-wider text-foreground">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-fg">{body}</p>
    </div>
  );
}

export function ContextDoctorExperience({
  initialSnapshot,
  defaultWorkspacePath,
  allowedRoots,
}: ContextDoctorExperienceProps) {
  const localScanEnabled = allowedRoots.length > 0;
  const [mode, setMode] = useState<DataMode>('mock');
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [workspacePath, setWorkspacePath] = useState(defaultWorkspacePath);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Loaded the bundled demo snapshot.');
  const [error, setError] = useState<string | null>(null);

  async function loadMockSnapshot() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/context-doctor/mock', {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await readJsonResponse(response);
      setSnapshot(data);
      setMode('mock');
      setStatus('Loaded the bundled demo snapshot.');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load the demo snapshot.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function runLocalScan() {
    if (!localScanEnabled) {
      setMode('mock');
      setError('Local Scan is disabled on this deployment. Run the app locally and configure CONTEXT_DOCTOR_ALLOWED_ROOTS to enable it.');
      setStatus('Showing the bundled demo snapshot.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/context-doctor/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: workspacePath.trim() ? workspacePath.trim() : undefined,
        }),
      });
      const data = await readJsonResponse(response);
      setSnapshot(data);
      setMode('local');
      setStatus(
        workspacePath.trim()
          ? `Scanned ${workspacePath.trim()} successfully.`
          : 'Scanned the default workspace from CONTEXT_DOCTOR_WORKSPACE.',
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to run the local scan.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function refreshCurrentMode() {
    if (mode === 'local') {
      void runLocalScan();
      return;
    }

    void loadMockSnapshot();
  }

  const allowedRootsLabel = allowedRoots.length > 0
    ? `${allowedRoots.length} allowed root${allowedRoots.length === 1 ? '' : 's'} configured`
    : 'Disabled on this deployment';
  const localScanHint = localScanEnabled
    ? (defaultWorkspacePath
        ? 'Leave the field blank to fall back to the configured default workspace.'
        : 'Provide an absolute path inside one of the configured allowed roots.')
    : 'Run locally and configure CONTEXT_DOCTOR_ALLOWED_ROOTS to enable Local Scan.';

  return (
    <div className="space-y-6">
      <section className="cyber-chamfer border border-border bg-card p-5">
        <div>
          <p className="font-label text-[11px] uppercase tracking-[0.2em] text-muted-fg">Standalone Next.js 16 demo</p>
          <h1 className="mt-2 font-heading text-2xl font-black uppercase leading-tight tracking-wider text-foreground md:text-4xl">
            OpenClaw Context Doctor turns messy prompt setup into a visible token budget.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-fg">
            Inspect the workspace files and installed skills that shape an agent&apos;s bootstrap context, then estimate how much room is left for
            the actual conversation. Start with a bundled demo snapshot, or run a live scan against your own workspace.
          </p>
        </div>

        <div className="mt-5 cyber-chamfer-sm border border-border bg-muted p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="shrink-0">
              <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">Data mode</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadMockSnapshot()}
                  disabled={isLoading}
                  className={cn(
                    'cyber-chamfer-sm border-2 px-4 py-2 font-label text-sm uppercase tracking-wider transition-colors duration-150',
                    mode === 'mock'
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-background text-muted-fg hover:border-accent/40 hover:text-accent',
                  )}
                >
                  Demo Snapshot
                </button>
                <button
                  type="button"
                  onClick={() => void runLocalScan()}
                  disabled={isLoading || !localScanEnabled}
                  className={cn(
                    'cyber-chamfer-sm border-2 px-4 py-2 font-label text-sm uppercase tracking-wider transition-colors duration-150',
                    mode === 'local'
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-background text-muted-fg hover:border-accent/40 hover:text-accent',
                    !localScanEnabled && 'cursor-not-allowed opacity-50 hover:border-border hover:text-muted-fg',
                  )}
                >
                  Local Scan
                </button>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-end">
              <div className="min-w-0 flex-1">
                <label className="block font-label text-[11px] uppercase tracking-[0.14em] text-muted-fg" htmlFor="workspace-path">
                  Workspace path
                </label>
                <input
                  id="workspace-path"
                  type="text"
                  value={workspacePath}
                  onChange={(event) => setWorkspacePath(event.target.value)}
                  placeholder="/Users/you/Documents/Web/project"
                  disabled={!localScanEnabled || isLoading}
                  className="cyber-chamfer-sm mt-2 w-full border border-border bg-input px-4 py-2.5 font-body text-sm text-accent outline-none transition-colors duration-200 placeholder:text-muted-fg/40 focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={() => void runLocalScan()}
                disabled={isLoading || !localScanEnabled}
                className="cyber-chamfer-sm shrink-0 inline-flex items-center gap-2 border-2 border-accent bg-accent/10 px-4 py-2.5 font-label text-sm uppercase tracking-wider text-accent transition-colors duration-150 hover:bg-accent hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Scan
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-fg">
            {mode === 'mock'
              ? 'Currently showing bundled demo data.'
              : 'Currently showing a real filesystem scan.'}
            {' '}{localScanHint}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 font-label text-[11px] uppercase tracking-[0.12em] text-muted-fg">
          <span className="border border-border bg-background px-3 py-1">Allowed roots: {allowedRootsLabel}</span>
          {localScanEnabled && defaultWorkspacePath ? (
            <span className="border border-border bg-background px-3 py-1">Default workspace configured</span>
          ) : null}
        </div>

        <div className="mt-5 border border-border bg-background px-4 py-3">
          <p className="font-label text-sm text-accent">{status}</p>
          {error ? <p className="mt-1 font-label text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <ContextDoctorDemo snapshot={snapshot} onRefresh={refreshCurrentMode} isRefreshing={isLoading} />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="cyber-chamfer border border-border bg-card p-5">
            <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">How it works</p>
            <div className="mt-4 space-y-4">
              <StepCard
                icon={<Database size={18} />}
                title="Snapshot contract"
                body="Every data mode returns the same Context Doctor snapshot shape, so the UI, tests, and future integrations can share one contract."
                seed="step-contract"
              />
              <StepCard
                icon={<FolderSync size={18} />}
                title="Workspace scan"
                body="Local Scan reads the standard bootstrap files plus discovered skills, then computes the bootstrap token budget and warning set."
                seed="step-scan"
              />
              <StepCard
                icon={<TerminalSquare size={18} />}
                title="Reality check"
                body="This tool estimates conversation headroom. It measures visible prompt baggage, not the full hidden runtime of every agent platform."
                seed="step-reality"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="cyber-chamfer border border-border bg-card p-5">
            <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">API Reference</p>
            <div className="mt-4 grid gap-4">
              <Snippet
                title="GET /api/context-doctor/mock"
                code={`curl http://localhost:3000/api/context-doctor/mock`}
              />
              <Snippet
                title="POST /api/context-doctor/scan"
                code={`curl -X POST http://localhost:3000/api/context-doctor/scan \\
  -H "Content-Type: application/json" \\
  -d '{"workspacePath":"/Users/you/Documents/Web/project","ctxSize":200000}'`}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-fg">
              The scan route only accepts workspace paths inside <code className="text-accent-tertiary">CONTEXT_DOCTOR_ALLOWED_ROOTS</code>. If you leave the path blank, the API
              will fall back to <code className="text-accent-tertiary">CONTEXT_DOCTOR_WORKSPACE</code> when it is configured.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
