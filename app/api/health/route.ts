import { withDatabase } from '@/db/client';

export async function GET() {
  try {
    const version = await withDatabase((database) => database.prepare('SELECT MAX(version) AS version FROM app_schema').first<{ version: number }>());
    return Response.json({ ok: true, database: true, schemaVersion: version?.version ?? null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ ok: false, database: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

