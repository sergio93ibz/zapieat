/**
 * modules/payments/service.ts
 * Redsys TPV Virtual integration.
 * Reference: https://pagosonline.redsys.es/documentacion.html
 */

import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import { markOrderPaid } from "@/modules/orders/service"
import { PaymentProvider, PaymentStatus, PaymentEnvironment, Prisma } from "@prisma/client"

// ─── Types ────────────────────────────────────────────────────

export interface RedsysParams {
  Ds_SignatureVersion: string
  Ds_MerchantParameters: string
  Ds_Signature: string
}

interface MerchantData {
  DS_MERCHANT_AMOUNT: string      // Amount in cents
  DS_MERCHANT_ORDER: string       // Unique 12-char order ID
  DS_MERCHANT_MERCHANTCODE: string
  DS_MERCHANT_CURRENCY: string    // 978 = EUR
  DS_MERCHANT_TRANSACTIONTYPE: string // 0 = standard auth
  DS_MERCHANT_TERMINAL: string
  DS_MERCHANT_NOTIFICATIONURL: string
  DS_MERCHANT_URLOK: string
  DS_MERCHANT_URLKO: string
}

const REDSYS_SANDBOX_URL =
  "https://sis-t.redsys.es:25443/sis/realizarPago"
const REDSYS_PRODUCTION_URL =
  "https://sis.redsys.es/sis/realizarPago"

// ─── Redsys Signature Helpers ─────────────────────────────────

/**
 * Derives a per-order key using 3DES from the merchant secret.
 */
function deriveKey(secretKey: string, orderId: string): Buffer {
  const key = Buffer.from(secretKey, "base64")
  // 3DES CBC with zero IV
  const cipher = crypto.createCipheriv(
    "des-ede3-cbc",
    key,
    Buffer.alloc(8, 0)
  )
  cipher.setAutoPadding(false)
  const orderHash = Buffer.alloc(8, 0)
  Buffer.from(orderId, "ascii").copy(orderHash)
  return Buffer.concat([cipher.update(orderHash), cipher.final()])
}

/**
 * Generates the Ds_Signature using HMAC-SHA256.
 */
function generateSignature(
  merchantParameters: string,
  derivedKey: Buffer
): string {
  return crypto
    .createHmac("sha256", derivedKey)
    .update(merchantParameters)
    .digest("base64")
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Generates the Redsys form parameters needed to redirect the customer to TPV.
 */
export async function generateRedsysParams(
  restaurantId: string,
  orderId: string,
  amountCents: number
): Promise<RedsysParams & { tpvUrl: string }> {
  // Get restaurant payment settings
  const settings = await prisma.restaurantPaymentSettings.findUnique({
    where: { restaurantId },
  })
  if (!settings || !settings.active) {
    throw new Error("Payment settings not configured for this restaurant")
  }

  const secretKey = decrypt(settings.secretKeyEncrypted)
  const redsysOrderId = orderId.replace(/-/g, "").slice(0, 12).toUpperCase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const merchantData: MerchantData = {
    DS_MERCHANT_AMOUNT: String(amountCents),
    DS_MERCHANT_ORDER: redsysOrderId,
    DS_MERCHANT_MERCHANTCODE: settings.merchantCode,
    DS_MERCHANT_CURRENCY: "978",
    DS_MERCHANT_TRANSACTIONTYPE: "0",
    DS_MERCHANT_TERMINAL: settings.terminal,
    DS_MERCHANT_NOTIFICATIONURL: `${appUrl}/api/payments/redsys/callback`,
    DS_MERCHANT_URLOK: `${appUrl}/confirmation?orderId=${orderId}`,
    DS_MERCHANT_URLKO: `${appUrl}/checkout?error=payment_failed&orderId=${orderId}`,
  }

  const merchantParameters = Buffer.from(
    JSON.stringify(merchantData)
  ).toString("base64")

  const derivedKey = deriveKey(secretKey, redsysOrderId)
  const signature = generateSignature(merchantParameters, derivedKey)

  const tpvUrl =
    settings.environment === PaymentEnvironment.PRODUCTION
      ? REDSYS_PRODUCTION_URL
      : REDSYS_SANDBOX_URL

  return {
    Ds_SignatureVersion: "HMAC_SHA256_V1",
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: signature,
    tpvUrl,
  }
}

/**
 * Verifies the Redsys server-to-server callback.
 * Returns the decoded merchant parameters if valid, throws if invalid.
 */
export async function verifyRedsysCallback(
  restaurantId: string,
  ds_SignatureVersion: string,
  ds_MerchantParameters: string,
  ds_Signature: string
): Promise<Record<string, string>> {
  if (ds_SignatureVersion !== "HMAC_SHA256_V1") {
    throw new Error("Unsupported signature version")
  }

  const settings = await prisma.restaurantPaymentSettings.findUnique({
    where: { restaurantId },
  })
  if (!settings) throw new Error("Payment settings not found")

  const secretKey = decrypt(settings.secretKeyEncrypted)
  const decoded = JSON.parse(
    Buffer.from(ds_MerchantParameters, "base64").toString("utf8")
  ) as Record<string, string>

  const orderId = decoded.Ds_Order
  const derivedKey = deriveKey(secretKey, orderId)
  const expectedSignature = generateSignature(ds_MerchantParameters, derivedKey)

  if (expectedSignature !== ds_Signature) {
    throw new Error("Invalid Redsys signature — possible tampering")
  }

  return decoded
}

/**
 * Processes a verified Redsys callback response code.
 * Response codes < 100 mean success.
 */
export async function processRedsysCallback(
  restaurantId: string,
  params: Record<string, string>
): Promise<void> {
  const responseCode = parseInt(params.Ds_Response ?? "9999", 10)
  const redsysOrderId = params.Ds_Order
  const amount = parseInt(params.Ds_Amount ?? "0", 10)

  // Find the order by redsys order id (stored in payment record)
  const payment = await prisma.payment.findFirst({
    where: { redsysOrderId, restaurantId },
  })

  const isSuccess = responseCode < 100

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        redsysResponse: params,
      },
    })

    if (isSuccess) {
      await markOrderPaid(payment.orderId)
    }
  }
}

/**
 * Creates a pending payment record when initiating a Redsys flow.
 */
export async function createPendingPayment(
  restaurantId: string,
  orderId: string,
  amountCents: number,
  redsysOrderId: string
) {
  return prisma.payment.create({
    data: {
      orderId,
      restaurantId,
      provider: PaymentProvider.REDSYS,
      amount: amountCents / 100,
      status: PaymentStatus.PENDING,
      redsysOrderId,
    },
  })
}

/**
 * Creates a payment record for Cash on Delivery.
 */
export async function createCashPayment(
  restaurantId: string,
  orderId: string,
  amount: number | Prisma.Decimal
) {
  return prisma.payment.create({
    data: {
      orderId,
      restaurantId,
      provider: PaymentProvider.CASH,
      amount,
      status: PaymentStatus.COMPLETED,
    },
  })
}
