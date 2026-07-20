import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import heroRiverCabin from '@/assets/hero-river-cabin.jpg';
import heroForestHammock from '@/assets/hero-forest-hammock.jpg';
import heroHillsideAerial from '@/assets/hero-hillside-aerial.jpg';

export function LandingPage() {
  return (
    <div>
      <section className="relative flex h-[70vh] min-h-[420px] items-end justify-center overflow-hidden">
        <img
          src={heroRiverCabin}
          alt="Cabaña de Centro Umepay junto al río, rodeada de montañas"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 pb-14 text-center text-white">
          <h1 className="text-4xl font-medium sm:text-5xl">Centro Umepay 🌿</h1>
          <p className="text-white/90">
            Organizá tu próximo retiro con nosotros. Elegí fechas disponibles y contanos sobre tu grupo.
          </p>
          <Link to="/reservar" className={cn(buttonVariants({ size: 'lg' }), 'shadow-lg')}>
            Solicitar fechas para mi retiro
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-1 sm:gap-2">
        <img
          src={heroForestHammock}
          alt="Cabaña entre árboles con hamaca al atardecer en Centro Umepay"
          className="aspect-[4/3] w-full object-cover"
        />
        <img
          src={heroHillsideAerial}
          alt="Vista aérea del predio de Centro Umepay entre las sierras"
          className="aspect-[4/3] w-full object-cover"
        />
      </section>
    </div>
  );
}
