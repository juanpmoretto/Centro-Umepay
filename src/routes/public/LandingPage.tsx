import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';

export function LandingPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-medium sm:text-4xl">Centro Umepay 🌿</h1>
      <p className="text-muted-foreground">
        Organizá tu próximo retiro con nosotros. Elegí fechas disponibles y contanos sobre tu grupo.
      </p>
      <Link to="/reservar" className={buttonVariants({ size: 'lg' })}>
        Solicitar fechas para mi retiro
      </Link>
    </div>
  );
}
