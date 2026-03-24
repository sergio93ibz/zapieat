import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/payments/redsys/return
 * Client browser return from Redsys TPV.
 * Payment result is determined server-side via the callback — this just redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")

  if (!orderId) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // The actual status update happens via the callback (POST).
  // Here we just redirect to the confirmation page to check status.
  return NextResponse.redirect(
    new URL(`/confirmation?orderId=${orderId}`, request.url)
  )
}
