import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import styles from "../storefront.module.css";
import { StorefrontLayout } from "../StorefrontLayout";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegalNoticePage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true, legalNotice: true, slug: true }
  });

  if (!restaurant) return notFound();

  return (
    <StorefrontLayout>
      <div className={styles.layout} style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link href={`/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316', textDecoration: 'none', marginBottom: '2rem', fontWeight: 700 }}>
            <ChevronLeft size={20} /> Volver a la carta
          </Link>
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fafaf9', marginBottom: '1rem' }}>Aviso Legal</h1>
          <p style={{ color: '#78716c', marginBottom: '3rem' }}>Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
          
          <div style={{ color: '#a8a29e', lineHeight: 1.8, fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>
            {restaurant.legalNotice || `
              En cumplimiento del artículo 10 de la Ley 34/2002, del 11 de julio, de servicios de la Sociedad de la Información y Comercio Electrónico (LSSICE) se exponen a continuación los datos identificativos de la empresa.

              Titular: ${restaurant.name}
              NIF/CIF: [Completar en ajustes]
              Dirección: [Completar en ajustes]
              Teléfono: [Completar en ajustes]
              Email: [Completar en ajustes]

              Este sitio web ha sido creado por la empresa ${restaurant.name} con carácter informativo y para uso profesional.
            `}
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
