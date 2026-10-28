/* Roboty, ktoré spúšťajú JavaScript alebo chodia po odkazoch (náhľady
   odkazov, monitoring, časť crawlerov). Bez tohto filtra by nám do
   návštevnosti tiekli stroje. Používa /api/navsteva aj /qr. */
export const ROBOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|pagespeed|monitor|uptime|curl|wget|python|scrapy|facebookexternalhit|whatsapp|telegram|discord|vercel-screenshot/i;
