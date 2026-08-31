/* Skelet administrácie Paciga.
   Layout podľa vzoru „Efferd Dashboard 2" z 21st.dev: úzky tmavý sidebar
   so skupinami, horná lišta s drobčekovou navigáciou a obsah bez vlastného
   rámu. Menu sa skladá až po načítaní právomocí (RPC moje_pristupy), preto
   je do tej chvíle vidieť kostra so skeletónmi. */
import { useEffect, useState, type ReactNode } from 'react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutGrid, FolderKanban, Users, ChartColumn, Newspaper, FileText,
  MessageSquare, Inbox, PencilRuler, Gauge, ShieldCheck, History, Plus,
  ExternalLink, LogOut, Phone, Bell, TrendingUp,
} from 'lucide-react';
import { getClient, mojProfil, maPristup, DEMO, ODKAZY } from '@/scripts/admin-core.js';

type Profil = { meno: string | null; email: string | null; pristupy: string[]; hlavny: boolean };

/** `pravo` je kľúč právomoci, keď sa líši od `key`. Parte, kondolencie
    a dopyty sú tri položky menu, ale jedna právomoc ('web').
    `lenHlavny` položky vidí iba hlavný správca. */
type Polozka = { key: string; label: string; href: string; ikona: typeof LayoutGrid; pravo?: string; lenHlavny?: boolean };

/* Sekcie admina rozdelené do troch skupín, ako má vzor. Poradie
   drží pracovný deň: najprv čo sa rieši denne, potom web, potom správa. */
const SKUPINY: { nadpis: string; polozky: Polozka[] }[] = [
  {
    nadpis: 'Prevádzka',
    polozky: [
      { key: 'dashboard', label: 'Prehľad', href: ODKAZY.dashboard, ikona: LayoutGrid },
      { key: 'zakazky', label: 'Zákazky', href: ODKAZY.zakazky, ikona: FolderKanban },
      { key: 'kontakty', label: 'Kontakty', href: ODKAZY.kontakty, ikona: Users },
      { key: 'statistiky', label: 'Štatistiky', href: ODKAZY.statistiky, ikona: ChartColumn },
    ],
  },
  {
    nadpis: 'Web',
    polozky: [
      { key: 'parte', label: 'Parte', href: ODKAZY.parte, ikona: FileText, pravo: 'web' },
      { key: 'kondolencie', label: 'Kondolencie', href: ODKAZY.kondolencie, ikona: MessageSquare, pravo: 'web' },
      { key: 'dopyty', label: 'Dopyty', href: ODKAZY.dopyty, ikona: Inbox, pravo: 'web' },
      { key: 'clanky', label: 'Aktuality', href: ODKAZY.clanky, ikona: Newspaper },
      { key: 'obsah', label: 'Obsah stránok', href: ODKAZY.obsah, ikona: PencilRuler },
      { key: 'navstevnost', label: 'Návštevnosť', href: ODKAZY.navstevnost, ikona: TrendingUp },
      { key: 'vitals', label: 'Rýchlosť webu', href: ODKAZY.vitals, ikona: Gauge },
    ],
  },
  {
    nadpis: 'Správa',
    polozky: [
      { key: 'pouzivatelia', label: 'Používatelia', href: '/admin/pouzivatelia', ikona: ShieldCheck, lenHlavny: true },
      { key: 'aktivita', label: 'Aktivita', href: ODKAZY.aktivita, ikona: History },
    ],
  },
];

export type AdminShellProps = {
  /** Nadpis stránky v drobčekovej navigácii. */
  titul: string;
  /** Kľúč sekcie — podčiarkne položku v menu. */
  sekcia: string;
  /** Počty na odznaky v menu, doplní ich stránka, keď ich už načítala. */
  children?: ReactNode;
};

export function AdminShell({ titul, sekcia, children }: AdminShellProps) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [cakajuce, setCakajuce] = useState<{ dopyty: number; kondolencie: number }>({ dopyty: 0, kondolencie: 0 });

  useEffect(() => {
    let zivy = true;
    (async () => {
      const p = (await mojProfil()) as Profil;
      if (zivy) setProfil(p);

      // Odznaky v menu: nevybavené dopyty a kondolencie čakajúce na schválenie.
      const sb = getClient();
      const [d, k] = await Promise.all([
        sb.from('dopyty').select('id', { count: 'exact', head: true }).eq('vybavene', false),
        sb.from('kondolencie').select('id', { count: 'exact', head: true }).eq('schvalene', false),
      ]);
      if (zivy) setCakajuce({ dopyty: d.count ?? 0, kondolencie: k.count ?? 0 });
    })().catch(() => {/* menu ostane bez odznakov, stránka funguje ďalej */});
    return () => { zivy = false; };
  }, []);

  const odhlasit = async () => {
    await getClient().auth.signOut();
    location.href = '/admin/login';
  };

  const inicialy = (profil?.meno || profil?.email || '?')
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  const odznak = (key: string) =>
    key === 'kondolencie' ? cakajuce.kondolencie : key === 'dopyty' ? cakajuce.dopyty : 0;

  return (
    <div data-ui21 className="font-sans text-foreground">
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
            <a href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <span className="grid size-7 shrink-0 place-items-center rounded-[5px] bg-primary text-[13px] font-bold text-primary-foreground">P</span>
              <span className="truncate text-[15px] font-semibold tracking-tight group-data-[collapsible=icon]:hidden">Paciga</span>
            </a>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-3">
            {/* Novú zákazku ponúkame len tomu, kto zákazky vôbec vidí.
                Staré menu to tak robilo (zostavMenu v admin-core), tento
                skelet tú kontrolu pri prepise na React stratil: obsluha
                webu bez práva 'zakazky' na tlačidlo klikla a requireAuth
                ju bez slova prehodilo na prvú dostupnú stránku. */}
            {profil && maPristup(profil, 'zakazky') && (
              <SidebarGroup className="pb-3 pt-0">
                <SidebarGroupContent>
                  <a
                    href="/admin/zakazky?nova=1"
                    className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-[13.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Plus className="size-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Nová zákazka</span>
                  </a>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {!profil && (
              <div className="space-y-2 px-2 py-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}

            {profil && SKUPINY.map((skupina) => {
              const viditelne = skupina.polozky.filter((p) =>
                p.lenHlavny ? profil.hlavny : maPristup(profil, p.pravo ?? p.key));
              if (!viditelne.length) return null;
              return (
                <SidebarGroup key={skupina.nadpis} className="py-2">
                  <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {skupina.nadpis}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {viditelne.map((p) => (
                        <SidebarMenuItem key={p.key}>
                          <SidebarMenuButton asChild isActive={p.key === sekcia} tooltip={p.label}>
                            <a href={p.href}>
                              <p.ikona className="size-4" />
                              <span>{p.label}</span>
                            </a>
                          </SidebarMenuButton>
                          {odznak(p.key) > 0 && <SidebarMenuBadge>{odznak(p.key)}</SidebarMenuBadge>}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="gap-0 border-t border-sidebar-border p-0">
            <div className="px-4 py-3 group-data-[collapsible=icon]:hidden">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Non stop linka</p>
              <a href="tel:+421918620620" className="mt-1 flex items-center gap-2 text-[14px] font-semibold">
                <Phone className="size-3.5" /> 0918 620 620
              </a>
            </div>
            <Separator className="bg-sidebar-border" />
            <div className="flex flex-col gap-0.5 p-2">
              <a
                href="/"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <ExternalLink className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Zobraziť web</span>
              </a>
              <button
                type="button"
                onClick={odhlasit}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Odhlásiť</span>
              </button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-w-0 bg-background">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
            <SidebarTrigger className="-ml-1 size-11 sm:size-7" />
            <Separator orientation="vertical" className="mr-1 h-4 bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:block">
                  <BreadcrumbLink href="/admin">Administrácia</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">{titul}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-2">
              <a
                href={ODKAZY.dopyty}
                aria-label="Čakajúce položky z webu"
                className="relative grid size-11 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground sm:size-8"
              >
                <Bell className="size-4" />
                {cakajuce.dopyty + cakajuce.kondolencie > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
                    {cakajuce.dopyty + cakajuce.kondolencie}
                  </span>
                )}
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Účet">
                    <Avatar className="size-11 border border-border sm:size-8">
                      <AvatarFallback className="bg-secondary text-[12px] font-semibold">{inicialy}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block text-sm font-semibold">{profil?.meno || 'Prihlásený'}</span>
                    <span className="block truncate text-xs text-muted-foreground">{profil?.email || ''}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={odhlasit}>
                    <LogOut className="size-4" /> Odhlásiť
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {DEMO && (
            <div className="border-b border-border bg-secondary px-6 py-2.5 text-[13px] text-muted-foreground">
              <strong className="font-semibold text-foreground">DEMO režim.</strong>{' '}
              Supabase nie je pripojené. Zmeny sa ukladajú len v tomto prehliadači.
            </div>
          )}

          <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export default AdminShell;
