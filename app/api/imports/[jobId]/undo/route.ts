import { noStoreJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireSession } from '@/lib/auth/sessions';
import { undoImport } from '@/lib/import/repository';

type RouteContext = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession(request);
    const { jobId } = await context.params;
    return noStoreJson(await undoImport(session.userId, jobId));
  } catch (error) {
    return authErrorResponse(error);
  }
}

