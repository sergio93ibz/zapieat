import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "../../storefront.module.css";
import { StorefrontLayout } from "../../StorefrontLayout";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string; page: string }>;
}

export default async function LegalPage({ params }: Props) {
  const { slug, page } = await params;
  
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug }
  });

  if (!restaurant) return notFound();

  let title = "Información Legal";
  let content = "";
  let fallback = "";

  switch (page) {
    case "legal":
      title = "Aviso Legal";
      content = (restaurant as any).legalNotice;
      fallback = `Este sitio web es titularidad de ${restaurant.name} con NIF [NIF] e inscrita en el Registro Mercantil. Domicilio social en ${restaurant.address || "..."}.`;
      break;
    case "privacidad":
      title = "Política de Privacidad";
      content = (restaurant as any).privacyPolicy;
      fallback = `De conformidad con el RGPD, ${restaurant.name} se compromete a la protección de los datos personales de sus clientes. No cedemos datos a terceros sin consentimiento expreso.`;
      break;
    case "cookies":
      title = "Política de Cookies";
      content = (restaurant as any).cookiesPolicy;
      fallback = "Utilizamos cookies propias y de terceros para mejorar tu experiencia de compra y navegación. Al continuar navegando, aceptas su uso.";
      break;
    case "terminos":
      title = "Términos y Condiciones";
      content = (restaurant as any).termsConditions;
      fallback = `Las presentes condiciones generales de contratación rigen la venta de los productos ofertados en esta web por parte de ${restaurant.name}. El envío se sujeta a las condiciones de reparto vigentes.`;
      break;
    case "contacto":
      title = "Contacto";
      content = `Puedes contactar con nosotros a través de:
      - Teléfono: ${restaurant.phone || "[Teléfono]"}
      - Email: [Email de contacto]
      - Dirección: ${restaurant.address || "[Dirección]"}
      Estamos a tu disposición para cualquier consulta.`;
      break;
    case "faq":
      title = "Preguntas Frecuentes";
      content = "PROXIMAMENTE: Podrás encontrar aquí las respuestas a las dudas más comunes sobre pedidos, pagos y devoluciones.";
      break;
    case "alergenos":
      title = "Información de Alérgenos";
      content = "IMPORTANTE: Todos nuestros platos indican los alérgenos presentes. Si tienes alguna intolerancia grave, por favor contacta directamente con el local por teléfono antes de realizar tu pedido.";
      break;
    default:
      return notFound();
  }

  return (
    <StorefrontLayout slug={slug}>
      <div className={styles.layout} style={{ minHeight: '100vh', padding: '6rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <header style={{ marginBottom: '4rem' }}>
            <Link href={`/${slug}`} className={styles.categoryLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '2rem', fontWeight: 800, padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
              <ChevronLeft size={20} /> Volver a la carta
            </Link>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fafaf9', marginBottom: '1.5rem', letterSpacing: '-0.04em' }}>{title}</h1>
            <p style={{ color: '#f97316', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
          </header>
          
          <div style={{ color: '#a8a29e', lineHeight: 1.9, fontSize: '1.15rem', whiteSpace: 'pre-wrap', borderLeft: '3px solid #f97316', paddingLeft: '2.5rem', marginTop: '3rem' }}>
            {content || fallback}
          </div>
          
          <footer style={{ marginTop: '8rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#57534e', textAlign: 'center', fontSize: '0.9rem' }}>
            © 2024 {restaurant.name} — Una experiencia premium impulsada por <a href="https://www.sitioswebpro.es" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', fontWeight: 800, textDecoration: 'none' }}>SitiosWebPRO</a>
          </footer>
        </div>
      </div>
    </StorefrontLayout>
  );
}
