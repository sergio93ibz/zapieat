import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function Home() {
  const session = await auth();
  
  // Si el usuario ya está conectado, va directo a su panel
  if (session?.user?.restaurantId || session?.user?.isSuperadmin) {
    redirect("/dashboard");
  }

  // De lo contrario, mostramos la Landing Page promocional
  return <LandingPage />;
}
