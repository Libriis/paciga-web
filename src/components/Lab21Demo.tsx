import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Phone } from 'lucide-react';

/* Demo ostrov: overuje, že shadcn/21st komponenty bežia v Astro
   s Paciga tokenmi (mono čierno-biela, Archivo) bez zásahu do styles.css. */
export default function Lab21Demo() {
  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <div className="flex flex-wrap items-center gap-4">
        <Button size="lg" className="rounded-full font-semibold">
          <Phone data-slot="icon" />
          NON STOP · 0903 596 364
        </Button>
        <Button variant="secondary">Sekundárne</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="a">
          <AccordionTrigger>Ako rýchlo viete prísť?</AccordionTrigger>
          <AccordionContent>
            Prevoz zosnulých zabezpečujeme nepretržite, 24 hodín denne, 7 dní
            v týždni. Volajte 0903 596 364.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Kde pôsobíte?</AccordionTrigger>
          <AccordionContent>
            Poprad, Spišská Belá a Liptovský Mikuláš, výjazdy podľa dohody.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="c">
          <AccordionTrigger>Čo všetko vybavíte za nás?</AccordionTrigger>
          <AccordionContent>
            Dokumenty, obrad, kvetinovú výzdobu aj oznámenia. Prevedieme vás
            krok za krokom.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
