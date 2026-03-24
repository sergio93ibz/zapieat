import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_zapieat_secret_key");

const CUSTOMER_COOKIE = "zapieat_customer";
const CUSTOMER_COOKIE_LEGACY = "zasfood_customer";

export async function signCustomerToken(customerId: string, restaurantId: string) {
  return await new SignJWT({ customerId, restaurantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // Sesión de 30 días para clientes
    .sign(SECRET);
}

export async function verifyCustomerToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { customerId: string, restaurantId: string };
  } catch (error) {
    return null;
  }
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value || cookieStore.get(CUSTOMER_COOKIE_LEGACY)?.value;
  if (!token) return null;
  return await verifyCustomerToken(token);
}

export async function setCustomerSession(customerId: string, restaurantId: string) {
  const token = await signCustomerToken(customerId, restaurantId);
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 // 30 días
  });
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE);
  cookieStore.delete(CUSTOMER_COOKIE_LEGACY);
}
