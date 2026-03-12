import { NextResponse } from 'next/server';
import { buildMockContextDoctorSnapshot } from '@/lib/context-doctor-mock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(buildMockContextDoctorSnapshot());
}
