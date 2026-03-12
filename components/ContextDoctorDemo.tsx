'use client';

import { useEffect, useState } from 'react';
import { RotateCw, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import type { ContextDoctorSnapshot, ContextDoctorWorkspaceSnapshot } from '@/lib/context-doctor-snapshot';

interface ContextDoctorDemoProps {
  snapshot: ContextDoctorSnapshot;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function statusBadge(file: ContextDoctorWorkspaceSnapshot['files'][number]) {
  if (file.status === 'missing' && file.expectedMissing) {
    return <span className="font-label text-xs uppercase tracking-wider text-muted-fg/50">FIRST RUN</span>;
  }

  switch (file.status) {
    case 'ok':
      return <span className="font-label text-xs uppercase tracking-wider text-accent">OK</span>;
    case 'truncated':
      return <span className="font-label text-xs uppercase tracking-wider text-destructive">TRUNCATED</span>;
    case 'missing':
      return <span className="font-label text-xs uppercase tracking-wider text-muted-fg/50">MISSING</span>;
  }
}

function statusIcon(file: ContextDoctorWorkspaceSnapshot['files'][number]) {
  if (file.status === 'missing' && file.expectedMissing) {
    return <span className="text-muted-fg/30">&#9675;</span>;
  }

  switch (file.status) {
    case 'ok':
      return <span className="text-accent">&#10003;</span>;
    case 'truncated':
      return <span className="text-destructive">&#9888;</span>;
    case 'missing':
      return <span className="text-muted-fg/40">&#10007;</span>;
  }
}

function DonutChart({ bootstrapPct }: { bootstrapPct: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const bootstrapArc = Math.min((bootstrapPct / 100) * circumference, circumference);
  const freeArc = Math.max(circumference - bootstrapArc, 0);
  const healthColor = bootstrapPct < 10
    ? '#00ff88'
    : bootstrapPct < 15
      ? '#ffe066'
      : '#ff3366';

  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#2a2a3a"
        strokeWidth="10"
      />
      <m.circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={healthColor}
        strokeWidth="10"
        strokeLinecap="butt"
        strokeDasharray={`${bootstrapArc} ${freeArc}`}
        strokeDashoffset={circumference * 0.25}
        initial={{ strokeDasharray: `0 ${circumference}` }}
        animate={{ strokeDasharray: `${bootstrapArc} ${freeArc}` }}
        transition={{ type: 'spring', bounce: 0.15, duration: 1.2 }}
      />
      <text x="50" y="46" textAnchor="middle" className="fill-foreground text-[13px] font-black" style={{ fontFamily: 'var(--font-orbitron)' }}>
        {bootstrapPct.toFixed(1)}%
      </text>
      <text x="50" y="58" textAnchor="middle" className="fill-muted-fg text-[7px] font-bold uppercase" style={{ fontFamily: 'var(--font-share-tech)' }}>
        bootstrap
      </text>
    </svg>
  );
}

function HealthBadge({ workspace }: { workspace: ContextDoctorWorkspaceSnapshot }) {
  if (workspace.health === 'healthy') {
    return (
      <span className="inline-flex items-center gap-2 border border-accent/40 bg-accent/10 px-3 py-1 font-label text-xs uppercase tracking-wider text-accent">
        <ShieldCheck size={14} />
        Healthy
      </span>
    );
  }

  if (workspace.health === 'moderate') {
    return (
      <span className="inline-flex items-center gap-2 border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 font-label text-xs uppercase tracking-wider text-yellow-400">
        <ShieldAlert size={14} />
        Moderate
      </span>
    );
  }

  const pct = workspace.budget.bootstrapPct;
  return (
    <span className="inline-flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-3 py-1 font-label text-xs uppercase tracking-wider text-destructive">
      <ShieldX size={14} />
      Heavy
      <span className="text-destructive/60">{pct.toFixed(1)}%</span>
    </span>
  );
}

const sectionEntrance = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.15, duration: 0.6 } },
};

const barStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const barSlide = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: { opacity: 1, scaleX: 1, transition: { type: 'spring' as const, bounce: 0.15, duration: 0.6 } },
};

function formatScanTime(scannedAt: string) {
  return `${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(scannedAt))} UTC`;
}

function formatSkillSource(source: ContextDoctorWorkspaceSnapshot['skills'][number]['source']) {
  switch (source) {
    case 'workspace':
      return 'Workspace';
    case 'repo':
      return 'Repo';
    case 'codex':
      return 'Codex';
    case 'claude':
      return 'Claude';
    case 'system':
      return 'System';
  }
}

function workspaceIssueCount(workspace: ContextDoctorWorkspaceSnapshot) {
  return workspace.warnings.truncated.length
    + workspace.warnings.missing.length
    + (workspace.warnings.totalCharsExceeded ? 1 : 0);
}

function WorkspaceChip({
  workspace,
  active,
  onSelect,
}: {
  workspace: ContextDoctorWorkspaceSnapshot;
  active: boolean;
  onSelect: () => void;
}) {
  const issueCount = workspaceIssueCount(workspace);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cyber-chamfer-sm border px-3 py-2 text-left transition-colors duration-150 ${
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-background text-muted-fg hover:border-accent/30 hover:text-accent/70'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-heading text-sm font-bold uppercase">{workspace.agentName}</span>
        <span className={`font-label text-[10px] uppercase tracking-[0.15em] ${
          active ? 'text-accent/70' : 'text-muted-fg/60'
        }`}>
          {workspace.health}
        </span>
      </div>
      <p className={`mt-1 font-label text-[11px] ${active ? 'text-accent/60' : 'text-muted-fg/50'}`}>
        {workspace.totalTokens.toLocaleString()} tok
        {issueCount > 0 ? ` · ${issueCount} issue${issueCount === 1 ? '' : 's'}` : ' · clean'}
      </p>
    </button>
  );
}

function snapshotLabel(snapshot: ContextDoctorSnapshot) {
  if (snapshot.source === 'mock') return 'Demo Snapshot';
  if (snapshot.source === 'vps') return 'Remote Snapshot';
  return 'Live Context Doctor';
}

function snapshotDescription(snapshot: ContextDoctorSnapshot, workspace: ContextDoctorWorkspaceSnapshot) {
  if (snapshot.source === 'mock') {
    return (
      <>
        Bundled demo data showing both a clean workspace and a warning-heavy workspace. You are currently viewing{' '}
        <span className="font-bold text-accent">{workspace.agentName}</span>.
      </>
    );
  }

  if (snapshot.source === 'vps') {
    return (
      <>
        Published snapshot data from a remote workspace export. You are currently viewing{' '}
        <span className="font-bold text-accent">{workspace.agentName}</span>.
      </>
    );
  }

  return (
    <>
      Live scan of <span className="font-bold text-accent">{workspace.workspace.label}</span>. File sizes and installed skills are
      real; framework overhead remains estimated.
    </>
  );
}

export function ContextDoctorDemo({
  snapshot,
  onRefresh,
  isRefreshing = false,
}: ContextDoctorDemoProps) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(snapshot.activeWorkspaceId);

  useEffect(() => {
    setActiveWorkspaceId(snapshot.activeWorkspaceId);
  }, [snapshot.activeWorkspaceId, snapshot.scannedAt]);

  const activeWorkspace = snapshot.workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? snapshot.workspaces[0];
  const visibleFiles = [...activeWorkspace.files].sort((left, right) => {
    const rank = (file: typeof left) => {
      if (file.status === 'missing' && file.expectedMissing) return 3;
      if (file.status === 'truncated') return 0;
      if (file.status === 'ok') return 1;
      return 2;
    };

    return rank(left) - rank(right) || right.chars - left.chars || left.name.localeCompare(right.name);
  });

  const maxFileChars = Math.max(1, ...visibleFiles.map((file) => file.chars));
  const maxBudgetTokens = Math.max(1, ...activeWorkspace.budget.segments.map((segment) => segment.tokens));
  const topSkills = activeWorkspace.skills.slice(0, 8);
  const skillSourceCounts = Array.from(
    activeWorkspace.skills.reduce((acc, skill) => {
      acc.set(skill.source, (acc.get(skill.source) ?? 0) + 1);
      return acc;
    }, new Map<ContextDoctorWorkspaceSnapshot['skills'][number]['source'], number>()),
  ).sort(([left], [right]) => left.localeCompare(right));
  const hasMissingWarnings = activeWorkspace.warnings.missing.length > 0;
  const missingTone = activeWorkspace.workspace.source === 'repo'
    ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
    : 'border-destructive/30 bg-destructive/10 text-destructive';
  const notes = [...new Set([...snapshot.notes, ...activeWorkspace.notes])];

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        variants={sectionEntrance}
        initial="hidden"
        animate="visible"
        className="cyber-chamfer border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-label text-[11px] uppercase tracking-[0.2em] text-muted-fg">
              <span>{snapshotLabel(snapshot)}</span>
              <span className="border border-border bg-background px-2 py-0.5 text-[10px] tracking-[0.16em] text-accent-tertiary">
                {activeWorkspace.workspace.descriptor}
              </span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold uppercase tracking-wider text-foreground md:text-2xl">
              How much context window is left for conversation?
            </h2>
            <p className="mt-1 text-sm text-muted-fg">
              {snapshotDescription(snapshot, activeWorkspace)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge workspace={activeWorkspace} />
            <button
              type="button"
              onClick={onRefresh}
              disabled={!onRefresh || isRefreshing}
              className="inline-flex items-center gap-2 border border-border bg-background px-3 py-1 font-label text-xs uppercase tracking-wider text-muted-fg transition-colors duration-150 hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 font-label text-[11px] uppercase tracking-[0.14em] text-muted-fg">
          <span className="border border-border bg-background px-3 py-1">
            {activeWorkspace.ctxSize.toLocaleString()} ctx
          </span>
          <span className="border border-border bg-background px-3 py-1">
            {activeWorkspace.maxCharsPerFile.toLocaleString()} max/file
          </span>
          <span className="border border-border bg-background px-3 py-1">
            Scanned {formatScanTime(activeWorkspace.scannedAt)}
          </span>
          {snapshot.publishedAt ? (
            <span className="border border-border bg-background px-3 py-1">
              Published {formatScanTime(snapshot.publishedAt)}
            </span>
          ) : null}
        </div>

        {snapshot.workspaces.length > 1 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {snapshot.workspaces.map((workspace) => (
              <WorkspaceChip
                key={workspace.id}
                workspace={workspace}
                active={workspace.id === activeWorkspace.id}
                onSelect={() => setActiveWorkspaceId(workspace.id)}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.35fr_0.65fr]">
          <div className="cyber-chamfer-sm flex flex-col items-center border border-border bg-background p-5">
            <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">Token Budget</p>
            <div className="mt-3">
              <DonutChart bootstrapPct={activeWorkspace.budget.bootstrapPct} />
            </div>

            <m.div
              key={`${activeWorkspace.id}:${activeWorkspace.scannedAt}`}
              className="mt-4 w-full space-y-1.5"
              variants={barStagger}
              initial="hidden"
              animate="visible"
            >
              {activeWorkspace.budget.segments.map((segment) => {
                const colorClass =
                  segment.key === 'systemPrompt'
                    ? 'bg-accent-tertiary/40'
                    : segment.key === 'workspaceFiles'
                      ? 'bg-accent/40'
                      : segment.key === 'skillsList'
                        ? 'bg-accent-secondary/40'
                        : segment.key === 'toolSchemas'
                          ? 'bg-yellow-400/40'
                          : 'bg-orange-400/30';

                return (
                  <div key={segment.key} className="flex items-center gap-2 text-xs">
                    <span className="w-24 truncate font-label text-muted-fg">{segment.label}</span>
                    <div className="relative h-3 flex-1 overflow-hidden bg-border/30">
                      <m.div
                        className={`absolute inset-y-0 left-0 ${colorClass}`}
                        variants={barSlide}
                        style={{
                          width: `${Math.max((segment.tokens / maxBudgetTokens) * 100, segment.tokens > 0 ? 6 : 0)}%`,
                          originX: 0,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-label text-muted-fg">{segment.percent.toFixed(1)}%</span>
                  </div>
                );
              })}
            </m.div>

            <div className="mt-4 w-full border-t border-border pt-3 text-center">
              <p className="font-heading text-2xl font-black text-accent">
                {activeWorkspace.budget.freeTokens.toLocaleString()}
              </p>
              <p className="font-label text-[11px] text-muted-fg">tokens free for conversation</p>
            </div>
          </div>

          <div className="cyber-chamfer-sm border border-border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">Workspace Files</p>
              <span className="border border-border bg-card px-3 py-1 font-label text-[11px] uppercase tracking-[0.12em] text-accent-tertiary">
                {activeWorkspace.agentName}
              </span>
            </div>

            <m.div
              key={`${activeWorkspace.id}:${activeWorkspace.scannedAt}:files`}
              className="mt-3 space-y-2"
              variants={barStagger}
              initial="hidden"
              animate="visible"
            >
              {visibleFiles.map((file) => (
                <m.div
                  key={file.name}
                  variants={barSlide}
                  className="flex items-center gap-3"
                  style={{ originX: 0 }}
                >
                  <span className="w-4 text-center text-sm">{statusIcon(file)}</span>
                  <span className="w-28 truncate font-label text-sm text-foreground">{file.name}</span>
                  <div className="flex-1">
                    {file.status !== 'missing' ? (
                      <div className="relative h-4 overflow-hidden bg-border/20">
                        <m.div
                          className={`absolute inset-y-0 left-0 ${
                            file.status === 'truncated' ? 'bg-destructive/40' : 'bg-accent/30'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(file.chars / maxFileChars) * 100}%` }}
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.8 }}
                        />
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                  <div className="w-24 text-right">
                    {file.status !== 'missing' ? (
                      <span className="font-label text-xs text-muted-fg">
                        {file.chars.toLocaleString()} chars
                      </span>
                    ) : file.expectedMissing ? (
                      <span className="font-label text-xs uppercase tracking-[0.12em] text-muted-fg/40">
                        bootstrap
                      </span>
                    ) : null}
                  </div>
                  <div className="w-28 text-right">{statusBadge(file)}</div>
                </m.div>
              ))}
            </m.div>

            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-label text-muted-fg">Total workspace</span>
                <span className="font-heading text-sm font-bold text-foreground">
                  {activeWorkspace.totalChars.toLocaleString()} chars · {activeWorkspace.totalTokens.toLocaleString()} tok
                </span>
              </div>
            </div>

            {activeWorkspace.warnings.truncated.length > 0 ? (
              <div className="mt-3 border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                {activeWorkspace.warnings.truncated.join(', ')} exceed {activeWorkspace.maxCharsPerFile.toLocaleString()} chars and
                may be silently truncated.
              </div>
            ) : null}

            {hasMissingWarnings ? (
              <div className={`mt-3 border px-4 py-3 text-xs ${missingTone}`}>
                {activeWorkspace.workspace.source === 'repo'
                  ? `Missing standard bootstrap files in repo mode: ${activeWorkspace.warnings.missing.join(', ')}.`
                  : `Missing or broken files: ${activeWorkspace.warnings.missing.join(', ')}.`}
              </div>
            ) : null}

            {activeWorkspace.warnings.totalCharsExceeded ? (
              <div className="mt-3 border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                Workspace files exceed the {activeWorkspace.maxCharsTotal.toLocaleString()} char bootstrap budget.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.58fr_0.42fr]">
          <div className="cyber-chamfer-sm border border-border bg-background p-5">
            <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">Installed Skills</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {skillSourceCounts.length > 0 ? (
                skillSourceCounts.map(([source, count]) => (
                  <span
                    key={source}
                    className="border border-border bg-card px-3 py-1 font-label text-[11px] uppercase tracking-[0.12em] text-accent-tertiary"
                  >
                    {formatSkillSource(source)} {count}
                  </span>
                ))
              ) : (
                <span className="border border-border bg-card px-3 py-1 font-label text-[11px] uppercase tracking-[0.12em] text-muted-fg/50">
                  None discovered
                </span>
              )}
            </div>

            {topSkills.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {topSkills.map((skill) => (
                  <div
                    key={`${skill.source}:${skill.name}`}
                    className="border border-border bg-card px-3 py-2 transition-colors duration-150 hover:border-accent/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-label text-sm text-foreground">{skill.name}</span>
                      <span className="font-label text-[10px] uppercase tracking-[0.12em] text-muted-fg">
                        {formatSkillSource(skill.source)}
                      </span>
                    </div>
                    <p className="mt-1 font-label text-xs text-muted-fg/60">
                      {skill.tokens.toLocaleString()} tok from {skill.chars.toLocaleString()} chars
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="mt-4 text-xs text-muted-fg">
              {activeWorkspace.skills.length.toLocaleString()} skills discovered for this workspace scan. They are shown for awareness and are not
              counted as fully loaded bootstrap content.
            </p>
          </div>

          <div className="cyber-chamfer-sm border border-border bg-muted p-5">
            <p className="font-label text-[11px] uppercase tracking-[0.18em] text-muted-fg">Reality Check</p>
            <div className="mt-3 space-y-2">
              {notes.map((note) => (
                <p key={note} className="text-sm text-muted-fg">
                  {note}
                </p>
              ))}
              {snapshot.meta.summary ? (
                <p className="text-sm font-bold text-foreground/80">
                  {snapshot.meta.summary}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </m.section>
    </LazyMotion>
  );
}
