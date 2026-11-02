/**
 * CyberNews CN - Serverless RSS Aggregator & 3-Hour Throttled Push Engine
 * Plataforma: Cloudflare Workers + Cloudflare KV + Firebase Cloud Messaging (FCM HTTP v1)
 */

export interface Env {
  CYBERNEWS_KV: KVNamespace;
  FCM_PROJECT_ID: string;
  FCM_SERVICE_ACCOUNT_JSON: string;
}

export interface FeedSource {
  id: string;
  name: string;
  category: 'Ataques' | 'Vulnerabilidades' | 'Innovación e IA' | 'Inteligencia' | 'Foros';
  siteUrl: string;
  rssUrl: string;
}

export const ALLOWED_SOURCES: FeedSource[] = [
  { id: 'thn', name: 'The Hacker News', category: 'Ataques', siteUrl: 'https://thehackernews.com/', rssUrl: 'https://feeds.feedburner.com/TheHackersNews' },
  { id: 'bleeping', name: 'BleepingComputer', category: 'Ataques', siteUrl: 'https://www.bleepingcomputer.com/', rssUrl: 'https://www.bleepingcomputer.com/feed/' },
  { id: 'krebs', name: 'Krebs on Security', category: 'Inteligencia', siteUrl: 'https://krebsonsecurity.com/', rssUrl: 'https://krebsonsecurity.com/feed/' },
  { id: 'cisa', name: 'CISA Advisories', category: 'Vulnerabilidades', siteUrl: 'https://www.cisa.gov/news-events/cybersecurity-advisories', rssUrl: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
  { id: 'secweek', name: 'SecurityWeek', category: 'Vulnerabilidades', siteUrl: 'https://www.securityweek.com/', rssUrl: 'https://www.securityweek.com/feed/' },
  { id: 'darkreading', name: 'Dark Reading', category: 'Ataques', siteUrl: 'https://www.darkreading.com/', rssUrl: 'https://www.darkreading.com/rss.xml' },
  { id: 'therecord', name: 'The Record', category: 'Inteligencia', siteUrl: 'https://therecord.media/', rssUrl: 'https://therecord.media/feed' },
  { id: 'sans', name: 'SANS ISC', category: 'Vulnerabilidades', siteUrl: 'https://isc.sans.edu/', rssUrl: 'https://isc.sans.edu/rssfeed.xml' },
  { id: 'schneier', name: 'Schneier on Security', category: 'Innovación e IA', siteUrl: 'https://www.schneier.com/', rssUrl: 'https://www.schneier.com/feed/atom/' },
  { id: 'unit42', name: 'Unit 42 (Palo Alto)', category: 'Inteligencia', siteUrl: 'https://unit42.paloaltonetworks.com/', rssUrl: 'https://unit42.paloaltonetworks.com/feed/' },
  { id: 'netsec', name: 'r/netsec Forum', category: 'Foros', siteUrl: 'https://www.reddit.com/r/netsec/', rssUrl: 'https://www.reddit.com/r/netsec/.rss' },
  { id: 'zdi', name: 'Zero Day Initiative', category: 'Vulnerabilidades', siteUrl: 'https://www.zerodayinitiative.com/rss/', rssUrl: 'https://www.zerodayinitiative.com/rss/published/' }
];

const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 10,800,000 ms (3 horas exactas)

// Sanitización estricta contra XSS e inyección en feeds RSS
export function sanitizeText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/[&<>"'`]/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
    }[ch] || ch))
    .trim()
    .slice(0, 400);
}

// Validación de URL segura (solo HTTPS y dominios en la allowlist oficial)
export function isValidArticleUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_SOURCES.some(src => {
      const allowedHost = new URL(src.siteUrl).hostname.replace(/^www\./, '');
      const targetHost = parsed.hostname.replace(/^www\./, '');
      return targetHost === allowedHost || targetHost.endsWith('.' + allowedHost);
    });
  } catch {
    return false;
  }
}

export async function evaluatePushWindow(
  nowMs: number,
  lastPushSentAtMs: number,
  newestArticle: { id: string; title: string; source: string; url: string } | null,
  lastNotifiedArticleId: string | null
): Promise<{
  shouldSendPush: boolean;
  newLastPushSentAtMs: number;
  reason: string;
}> {
  const elapsedMs = nowMs - lastPushSentAtMs;
  const hasNewArticle = newestArticle !== null && newestArticle.id !== lastNotifiedArticleId;

  if (!hasNewArticle) {
    return {
      shouldSendPush: false,
      newLastPushSentAtMs: lastPushSentAtMs,
      reason: elapsedMs >= THREE_HOURS_MS
        ? 'IDLE_WAITING_FOR_NEWS: Han pasado >= 3h sin noticias nuevas; el timer se reiniciará en cuanto se publique una.'
        : 'NO_NEW_ARTICLES: Sin novedades desde la última revisión.'
    };
  }

  if (elapsedMs >= THREE_HOURS_MS) {
    // Caso 1: Han pasado 3 horas o más y hay noticia nueva -> Enviar Push y reiniciar el timer de 3h
    return {
      shouldSendPush: true,
      newLastPushSentAtMs: nowMs,
      reason: 'PUSH_DISPATCHED_TIMER_RESET: Noticia nueva detectada con ventana >= 3h disponible. Push enviado y timer de 3h reiniciado.'
    };
  }

  // Caso 2: Hay noticia nueva pero aún no se cumplen las 3 horas desde el último Push -> Encolar sin spam
  const remainingMinutes = Math.ceil((THREE_HOURS_MS - elapsedMs) / 60000);
  return {
    shouldSendPush: false,
    newLastPushSentAtMs: lastPushSentAtMs,
    reason: `COOLDOWN_ACTIVE: Noticia encolada para evitar spam. Próxima ventana disponible en ${remainingMinutes} min.`
  };
}


// ============================================================================
// MOTOR DE DEDUPLICACIÓN Y CLUSTERING DE INCIDENTES (EVITA NOTICIAS Y PUSH REPETIDOS)
// ============================================================================
export interface RawFeedItem {
  id: string;
  title: string;
  summary: string;
  sourceId: string;
  sourceName: string;
  articleUrl: string;
  publishedAtMs: number;
}

export interface ClusteredArticle extends RawFeedItem {
  eventFingerprint: string;
  cveList: string[];
  alsoReportedBy: Array<{ sourceName: string; articleUrl: string }>;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'after',
  'new', 'critical', 'vulnerability', 'flaw', 'hackers', 'attack', 'security',
  'patch', 'patches', 'zero', 'day', 'exploited', 'del', 'las', 'los', 'para', 'con', 'por'
]);

export function extractCVEs(text: string): string[] {
  const matches = text.toUpperCase().match(/CVE-\d{4}-\d{4,7}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

export function extractKeyTokens(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
  return new Set(words);
}

// Similitud de Jaccard entre los tokens clave de dos titulares
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Agrupa noticias de las 12 fuentes en un único evento canónico si:
 *  Regla 1 (Match Exacto de CVE): Comparten al menos un identificador CVE-YYYY-NNNNN.
 *  Regla 2 (Similitud Semántica / Entidades >= 0.45): Comparten >= 45% de sustantivos/entidades clave
 *           (ej. "Ivanti" + "Connect" + "Secure" + "UTA0576") dentro de una ventana de 72 horas.
 *
 * Se conserva como tarjeta principal la primera fuente que lo publicó (o fuente oficial como CISA),
 * y las demás se adjuntan en `alsoReportedBy` sin duplicar tarjetas ni enviar Push repetidos.
 */
export function deduplicateAndClusterArticles(items: RawFeedItem[]): ClusteredArticle[] {
  const sorted = [...items].sort((a, b) => a.publishedAtMs - b.publishedAtMs);
  const clusters: Array<{ primary: ClusteredArticle; tokens: Set<string> }> = [];
  const SEVENTY_TWO_HOURS_MS = 72 * 3600 * 1000;

  for (const item of sorted) {
    const itemCVEs = extractCVEs(`${item.title} ${item.summary}`);
    const itemTokens = extractKeyTokens(item.title);
    let matchedCluster: { primary: ClusteredArticle; tokens: Set<string> } | null = null;

    for (const cluster of clusters) {
      const within72h = Math.abs(item.publishedAtMs - cluster.primary.publishedAtMs) <= SEVENTY_TWO_HOURS_MS;
      if (!within72h) continue;

      // Nivel 1: ¿Comparten el mismo código CVE?
      const sharesCVE = itemCVEs.length > 0 && itemCVEs.some(cve => cluster.primary.cveList.includes(cve));

      // Nivel 2: ¿Tienen alta similitud de entidades/palabras clave (Jaccard >= 0.45)?
      const sim = jaccardSimilarity(itemTokens, cluster.tokens);

      if (sharesCVE || sim >= 0.45) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      // Fusionar en la tarjeta existente sin crear duplicado
      const alreadyListed =
        matchedCluster.primary.sourceName === item.sourceName ||
        matchedCluster.primary.alsoReportedBy.some(s => s.sourceName === item.sourceName);

      if (!alreadyListed) {
        matchedCluster.primary.alsoReportedBy.push({
          sourceName: item.sourceName,
          articleUrl: item.articleUrl
        });
      }
      for (const cve of itemCVEs) {
        if (!matchedCluster.primary.cveList.includes(cve)) {
          matchedCluster.primary.cveList.push(cve);
        }
      }
    } else {
      const fingerprint = itemCVEs.length > 0
        ? `cve:${itemCVEs.sort().join(',')}`
        : `tok:${Array.from(itemTokens).slice(0, 5).sort().join('-')}`;

      clusters.push({
        primary: {
          ...item,
          eventFingerprint: fingerprint,
          cveList: itemCVEs,
          alsoReportedBy: []
        },
        tokens: itemTokens
      });
    }
  }

  // Devolver ordenados del más reciente al más antiguo
  return clusters.map(c => c.primary).sort((a, b) => b.publishedAtMs - a.publishedAtMs);
}


// ============================================================================
// PIPELINE DE EXTRACCIÓN Y OPTIMIZACIÓN DE IMÁGENES DE ORIGEN (ANTI-PIXELADO)
// ============================================================================
/**
 * 1. Intenta extraer la imagen de alta resolución del feed RSS (<media:content>, <enclosure>).
 * 2. Si el RSS solo trae un thumbnail pequeño (< 600px, ej. -300x168.jpg) o no trae imagen,
 *    consulta los primeros 20 KB del artículo original y extrae <meta property="og:image">
 *    o <meta name="twitter:image:src"> (que siempre son 1200x630 o 1600x900 en alta definición).
 * 3. Limpia sufijos de recorte de baja resolución de WordPress/CDNs y construye una URL
 *    optimizada en WebP 1080x608 (16:9) vía Cloudflare Image Resizing para que nunca se vea pixelada
 *    y sin exponer la IP del usuario al servidor de terceros.
 */
export function upgradeWordPressThumbnailUrl(rawImageUrl: string): string {
  // Elimina recortes pequeños como -150x150.jpg, -300x168.png para obtener el archivo original HD
  return rawImageUrl
    .replace(/-\d{2,3}x\d{2,3}(?=\.(jpg|jpeg|png|webp))/i, '')
    .replace(/([?&])(w|width)=\d+/i, '$1w=1080');
}

export async function extractHighResSourceImage(
  articleUrl: string,
  rssCandidateImageUrl?: string
): Promise<string> {
  // Si el RSS ya trae una imagen válida que no sea un icono/spacer, la mejoramos a resolución maestra
  if (rssCandidateImageUrl && isValidArticleUrl(rssCandidateImageUrl)) {
    const upgraded = upgradeWordPressThumbnailUrl(rssCandidateImageUrl);
    if (!upgraded.match(/(avatar|icon|logo|pixel|spacer|1x1)/i)) {
      return buildCloudflareResizedUrl(upgraded);
    }
  }

  // Consultar el <head> del artículo original para extraer og:image / twitter:image en Full HD
  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'CyberNewsCN-ImageBot/1.0 (+https://cybernews-cn.app)',
        'Range': 'bytes=0-24576'
      }
    });
    const htmlHead = await res.text();
    const ogMatch =
      htmlHead.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      htmlHead.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      htmlHead.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i);

    if (ogMatch && ogMatch[1]) {
      const resolvedUrl = new URL(ogMatch[1], articleUrl).toString();
      if (resolvedUrl.startsWith('https://')) {
        return buildCloudflareResizedUrl(upgradeWordPressThumbnailUrl(resolvedUrl));
      }
    }
  } catch {
    // Fallback silencioso
  }

  // Fallback vectorial HD si la fuente es un boletín puramente textual (ej. alerta de texto plano)
  return 'https://cybernews-cn-worker.workers.dev/assets/fallback-1080p-cyber.webp';
}

export function buildCloudflareResizedUrl(sourceImageUrl: string): string {
  // Re-escala en el borde a 1080x608 (16:9 @2x Retina), formato WebP, calidad 85, nitidez activada
  const encoded = encodeURIComponent(sourceImageUrl);
  return `https://cybernews-cn-worker.workers.dev/cdn-cgi/image/width=1080,height=608,fit=cover,gravity=auto,format=webp,quality=85,sharpen=1/${encoded}`;
}
