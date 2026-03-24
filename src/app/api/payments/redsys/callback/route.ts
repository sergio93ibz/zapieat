import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/payments/redsys/callback
 * Server-to-server notification from Redsys (S2S webhook).
 * Must respond with HTTP 200 immediately after verification.
 */
export async function POST(request: NextRequest) {
  // Card payments are not part of the cash-only MVP.
  // Keep the endpoint for later wiring.
  return new NextResponse("Not implemented", { status: 501 })
}
