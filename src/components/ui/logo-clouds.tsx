"use client";

/*
  Partneri ako logo cloud s periodickou vlnou — 21st.dev logo-clouds
  (LogoCloudSwap), prispôsobené pre Paciga:
  - motion/react namiesto framer-motion (v repe už je motion v12)
  - žiadny LOGOS util: partneri prichádzajú ako serializovateľné props
    z Astro ostrova (client:visible), monogram sa počíta z názvu
  - položky sú odkazy na weby partnerov, tokeny z tw.css (soft/gold/line)
  - prefers-reduced-motion vypína vlnu, hover zvýraznenie ostáva
*/

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type PartnerEntry = {
  name: string;
  href: string;
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

function initials(name: string): string {
  return name
    .replace(/\.[a-z]{2,}$/i, "")
    .trim()
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

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
              opacity: [1, 0.2, 1],
            }
          : {
              clipPath: "inset(0 0% 0 0)",
              filter: "blur(0px)",
              opacity: 1,
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
      className="group flex w-20 shrink-0 flex-col items-center gap-2.5 no-underline sm:w-24"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-[13px] font-semibold tracking-wide text-soft transition-colors duration-300 group-hover:border-gold group-hover:text-gold sm:h-12 sm:w-12">
        {initials(partner.name)}
      </span>
      <span className="select-none whitespace-nowrap text-[12.5px] font-medium tracking-wide text-soft transition-colors duration-300 group-hover:text-snow sm:text-[11.5px]">
        {partner.name}
      </span>
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
        <div className="hidden items-center justify-center gap-4 sm:flex sm:flex-wrap sm:gap-6 md:gap-8 lg:gap-10">
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

        <div className="grid grid-cols-3 place-items-center gap-y-6 sm:hidden">
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
