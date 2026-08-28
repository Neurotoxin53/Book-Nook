import type { GoodreadsNormalizedRow } from '@/lib/domain/types';
import { noStoreJson, readJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireSession } from '@/lib/auth/sessions';
import { findResumableImportJob, importGoodreadsChunk, startImportJob } from '@/lib/import/repository';

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await readJson<{
      jobId?: string;
      totalRows?: number;
      rows?: GoodreadsNormalizedRow[];
      finalize?: boolean;
      resumeRowNumber?: number;
      resumeFingerprint?: string;
    }>(request, 2_000_000);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const totalRows = Math.max(rows.length, body.totalRows ?? rows.length);
    const resumableJobId = !body.jobId
      && Number.isInteger(body.resumeRowNumber)
      && typeof body.resumeFingerprint === 'string'
      && body.resumeFingerprint
      ? await findResumableImportJob(session.userId, totalRows, body.resumeRowNumber!, body.resumeFingerprint)
      : null;
    const jobId = body.jobId ?? resumableJobId ?? await startImportJob(session.userId, totalRows);
    const summary = await importGoodreadsChunk(session.userId, jobId, rows, body.finalize ?? true);
    return noStoreJson({ summary }, { status: body.jobId ? 200 : 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
