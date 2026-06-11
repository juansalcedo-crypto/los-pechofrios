import { NextResponse } from 'next/server';
import { getStandings } from '@/lib/football';

export async function GET() {
  try {
    const standings = await getStandings();
    return NextResponse.json({ standings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
