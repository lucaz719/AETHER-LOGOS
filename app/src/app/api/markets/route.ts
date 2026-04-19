import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    markets: [],
    updatedAt: new Date().toISOString(),
  });
}
