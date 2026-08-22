"use client";

/*
  Partneri ako logo cloud s periodickou vlnou — 21st.dev logo-clouds
  (LogoCloudSwap), prispôsobené pre Paciga:
  - motion/react namiesto framer-motion (v repe už je motion v12)
  - žiadny LOGOS util: partneri prichádzajú ako serializovateľné props
    z Astro ostrova (client:visible)
  - od 22. 8. 2026 reálne logá partnerov namiesto monogramov. Sú to biele
    siluety (alfa kanál originálu vyplnený bielou), aby sedeli na tmavý
    monochromatický web a navzájom sa nebili farbami. Zdroje sú stiahnuté
    z webov partnerov, prepočet robí scripts/loga-partnerov.mjs.
  - názov partnera sa už nevypisuje: logá sú wordmarky a text pod nimi by
    bol druhýkrát to isté. Meno nesie aria-label a alt.
  - položky sú odkazy na weby partnerov, tokeny z tw.css (soft/gold/line)
  - prefers-reduced-motion vypína vlnu, hover zvýraznenie ostáva
*/

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type PartnerEntry = {
  name: string;
  href: string;
  /** biela silueta loga, 1x (v public/partneri) */
  logo: string;
  /** to isté v 2x pre retinu */
  logo2x: string;
  /** rozmery v CSS px, v akých sa logo kreslí (držia optickú rovnováhu radu) */
  w: number;
  h: number;
};

export type LogoCloudSwapProps = {
  partners?: PartnerEntry[];
  title?: string;
  subtitle?: string;
  interval?: number;
  stagger?: number;
  className?: string;
};

const WIPE_DURATION = 0.92;
const WIPE_TIMES = [0, 0.4, 1];

function LogoItem({
  partner,
  index,
  isWaving,
  stagger,
  totalCount,
  onDone,
}: {
  partner: PartnerEntry;
  index: number;
  isWaving: boolean;
  stagger: number;
  totalCount: number;
  onDone: () => void;
}) {
  return (
    <motion.a
      href={partner.href}
      target="_blank"
      rel="noopener"
      aria-label={partner.name}
      animate={
        isWaving
          ? {
              clipPath: [
                "inset(0 0% 0 0)",
                "inset(0 100% 0 0)",
                "inset(0 0% 0 0)",
              ],
              filter: ["blur(0px)", "blur(8px)", "blur(0px)"],
              opacity: [0.62, 0.14, 0.62],
            }
          : {
              clipPath: "inset(0 0% 0 0)",
              filter: "blur(0px)",
              opacity: 0.62,
            }
      }
      transition={
        isWaving
          ? {
              clipPath: {
                duration: WIPE_DURATION,
                times: WIPE_TIMES,
                ease: ["easeIn", [0.16, 1, 0.3, 1]],
                delay: index * stagger,
              },
              filter: {
                duration: WIPE_DURATION * 0.9,
                times: WIPE_TIMES,
                ease: "easeInOut" as const,
                delay: index * stagger,
              },
              opacity: {
                duration: WIPE_DURATION * 0.85,
                times: WIPE_TIMES,
                ease: "easeInOut" as const,
                delay: index * stagger,
              },
            }
          : {
              duration: 0.3,
              ease: "easeOut",
            }
      }
      onAnimationComplete={() => {
        if (isWaving && index === totalCount - 1) onDone();
      }}
      whileHover={{
        scale: 1.07,
        opacity: 1,
        filter: "blur(0px)",
        transition: { type: "spring", stiffness: 340, damping: 24 },
      }}
      className="flex shrink-0 items-center justify-center no-underline"
    >
      {/* Rozmer drží CSS premenná, nie utility trieda: každé logo má vlastnú
          optickú výšku a mobil celý rad zmenší cez --logo-scale. Atribúty
          width/height sedia s 1x rozmerom, takže miesto je rezervované
          dopredu a rad pri načítaní nepodskočí. */}
      <img
        src={partner.logo}
        srcSet={`${partner.logo} 1x, ${partner.logo2x} 2x`}
        width={partner.w}
        height={partner.h}
        alt={partner.name}
        loading="lazy"
        decoding="async"
        style={{
          width: `calc(${partner.w}px * var(--logo-scale, 1))`,
          height: `calc(${partner.h}px * var(--logo-scale, 1))`,
        }}
      />
    </motion.a>
  );
}

export default function LogoCloudSwap({
  partners = [],
  title,
  subtitle,
  interval = 3200,
  stagger = 0.11,
  className,
}: LogoCloudSwapProps) {
  const [waving, setWaving] = React.useState(false);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setWaving(true), interval);
    return () => clearInterval(id);
  }, [interval, reduced]);

  return (
    <div className={cn("w-full", className)}>
      {(title || subtitle) && (
        <div className="mx-auto max-w-2xl text-center">
          {title && (
            <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-gold">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-3 text-[15.5px] text-soft">{subtitle}</p>
          )}
        </div>
      )}

      <div className="mx-auto mt-10 max-w-5xl">
        {/* Mobil má mriežku 2 v rade, nie flex-wrap: logá sú rôzne široké,
            takže voľné zalamovanie dávalo rady po 2, 3 a napokon jedno
            osamotené. Od sm ide flex-wrap, tam je miesta dosť a rad sa
            zalomí pekne sám. */}
        <div className="grid grid-cols-2 place-items-center gap-x-6 gap-y-8 [--logo-scale:0.62] sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-11 sm:gap-y-9 sm:[--logo-scale:0.82] lg:gap-x-12 lg:[--logo-scale:1]">
          {partners.map((p, i) => (
            <LogoItem
              key={p.name}
              partner={p}
              index={i}
              isWaving={waving}
              stagger={stagger}
              totalCount={partners.length}
              onDone={() => setWaving(false)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
