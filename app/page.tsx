import { ContextDoctorExperience } from '@/components/ContextDoctorExperience';
import { buildMockContextDoctorSnapshot } from '@/lib/context-doctor-mock';
import { getAllowedRootsFromEnv, getDefaultWorkspaceFromEnv } from '@/lib/context-doctor-security';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const initialSnapshot = buildMockContextDoctorSnapshot();
  const allowedRoots = getAllowedRootsFromEnv();
  const defaultWorkspacePath = getDefaultWorkspaceFromEnv() ?? '';

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="cyber-chamfer-sm mb-6 border border-border bg-card px-5 py-4">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-accent/60">Open-source reference app</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-fg">
            Extracted from a larger operator surface and rebuilt as a focused standalone demo for visualizing bootstrap prompt pressure.
          </p>
        </div>

        <ContextDoctorExperience
          initialSnapshot={initialSnapshot}
          allowedRoots={allowedRoots}
          defaultWorkspacePath={defaultWorkspacePath}
        />
      </div>
    </main>
  );
}
