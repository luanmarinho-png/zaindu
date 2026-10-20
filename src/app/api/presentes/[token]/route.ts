import { getDatabase } from '@/lib/mongodb';
import { cardForToken, claimPrize, readPrize } from '@/lib/prizes/store';
import { prizeBody, prizeFailure, prizeJson } from '@/lib/prizes/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ token: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const card = cardForToken((await context.params).token);
    if (!card) return prizeJson({ state: 'invalid' }, 404);
    return prizeJson(await readPrize(await getDatabase(), card, request.headers.get('x-prize-receipt') || undefined));
  }
  catch (error) { return prizeFailure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const card = cardForToken((await context.params).token);
    if (!card) return prizeJson({ state: 'invalid' }, 404);
    const body = await prizeBody(request);
    return prizeJson(await claimPrize(await getDatabase(), card, body));
  } catch (error) { return prizeFailure(error); }
}
