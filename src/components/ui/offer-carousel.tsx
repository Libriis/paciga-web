"use client";

/*
  Karusel služieb — 21st.dev Offer Carousel, prispôsobený pre Paciga:
  - motion/react namiesto framer-motion (v repe je motion v12)
  - promo polia originálu (brandLogo, promoCode, Tag ikona) nahradené
    číslom služby a krátkym faktom; tag nesie názov skupiny
  - fotky klasické farebné (požiadavka 14.8.2026, žiadny grayscale
    filter); položka bez fotky má vyznačený prázdny slot
  - šípky sa renderujú len keď pás naozaj pretečie a len pre myš;
    na dotyku ostáva swipe so snapom
  - prefers-reduced-motion vypína lift karty
*/

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KartaSluzby {
  id: string;
  /** hotová URL z astro:assets (getImage), null = služba zatiaľ bez fotky */
  foto: string | null;
  fotoAlt?: string;
  /** názov skupiny služieb, zobrazuje sa ako tag nad titulkom */
  tag: string;
  nazov: string;
  popis: string;
  /** poradové číslo v registri, napr. "01" */
  cislo: string;
  /** krátky fakt do pätičky, napr. "20 prevedení" */
  fakt: string;
  href: string;
}

interface OfferCardProps {
  karta: KartaSluzby;
}

const OfferCard = React.forwardRef<HTMLAnchorElement, OfferCardProps>(({ karta }, ref) => {
  const reduce = useReducedMotion();
  return (
    <motion.a
      ref={ref}
      id={karta.id}
      href={karta.href}
      className="group/karta relative flex h-[470px] w-[330px] flex-none snap-start scroll-mt-[90px] flex-col overflow-hidden rounded-[2px] border border-border bg-card transition-[border-color,box-shadow] duration-300 hover:border-white/35 hover:shadow-[0_26px_60px_rgba(0,0,0,0.55)]"
      whileHover={reduce ? undefined : { y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {karta.foto ? (
        <span className="relative h-[48%] flex-none overflow-hidden bg-muted">
          <img
            src={karta.foto}
            alt={karta.fotoAlt ?? ""}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/karta:scale-[1.07]"
          />
        </span>
      ) : (
        <span className="flex h-[48%] flex-none items-center justify-center border-b border-dashed border-white/15 bg-muted">
          <i className="text-[10px] font-normal uppercase not-italic tracking-[0.16em] text-white/25">
            foto pripravujeme
          </i>
        </span>
      )}

      <span className="flex min-h-0 flex-1 flex-col gap-2 p-5">
        <span className="flex items-center gap-2.5 text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          <span aria-hidden="true" className="h-px w-4 bg-white/25" />
          {karta.tag}
        </span>
        <span className="text-[22px] font-semibold leading-[1.15] tracking-[-0.015em] text-card-foreground">
          {karta.nazov}
        </span>
        <span className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{karta.popis}</span>

        <span className="mt-auto flex items-center justify-between border-t border-border pt-3.5">
          <span className="flex items-baseline gap-2.5">
            <span className="text-xs tracking-[0.08em] text-white/35 tabular-nums">{karta.cislo}</span>
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">{karta.fakt}</span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover/karta:-rotate-45 group-hover/karta:border-primary group-hover/karta:bg-primary group-hover/karta:text-primary-foreground">
            <ArrowRight className="h-4 w-4" />
          </span>
        </span>
      </span>
    </motion.a>
  );
});
OfferCard.displayName = "OfferCard";

export interface OfferCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  polozky: KartaSluzby[];
}

const OfferCarousel = React.forwardRef<HTMLDivElement, OfferCarouselProps>(
  ({ polozky, className, ...props }, ref) => {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [pretecene, setPretecene] = React.useState(false);

    React.useEffect(() => {
      const el = trackRef.current;
      if (!el) return;
      const over = () => setPretecene(el.scrollWidth > el.clientWidth + 4);
      over();
      const ro = new ResizeObserver(over);
      ro.observe(el);
      return () => ro.disconnect();
    }, [polozky.length]);

    const posun = (smer: "left" | "right") => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollBy({ left: (smer === "left" ? -1 : 1) * el.clientWidth * 0.8, behavior: "smooth" });
    };

    return (
      <div ref={ref} className={cn("group/pas relative w-full", className)} {...props}>
        {pretecene && (
          <button
            type="button"
            onClick={() => posun("left")}
            aria-label="Posunúť služby doľava"
            className="absolute -left-3 top-[42%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/65 text-foreground opacity-0 backdrop-blur-sm transition-opacity duration-300 hover:border-white/50 group-hover/pas:opacity-100 [@media(pointer:fine)]:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {polozky.map((karta) => (
            <OfferCard key={karta.id} karta={karta} />
          ))}
        </div>

        {pretecene && (
          <button
            type="button"
            onClick={() => posun("right")}
            aria-label="Posunúť služby doprava"
            className="absolute -right-3 top-[42%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/65 text-foreground opacity-0 backdrop-blur-sm transition-opacity duration-300 hover:border-white/50 group-hover/pas:opacity-100 [@media(pointer:fine)]:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  }
);
OfferCarousel.displayName = "OfferCarousel";

export { OfferCarousel, OfferCard };
