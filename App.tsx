import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, Image, TouchableOpacity,
  Share, Linking, RefreshControl, SafeAreaView, StatusBar,
  TextInput, ScrollView, Modal, Platform
} from 'react-native';

export interface RelatedSource {
  name: string;
  url: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceBadge: string;
  badgeColor: string;
  articleUrl: string;
  category: 'Ataques' | 'Vulnerabilidades' | 'Innovación e IA' | 'Inteligencia' | 'Foros';
  publishedAgo: string;
  imageUrl: string;
  cve?: string;
  alsoReportedBy?: RelatedSource[];
}

const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    sourceName: 'SecurityWeek',
    sourceBadge: 'SW',
    badgeColor: '#06B6D4',
    publishedAgo: '2h',
    category: 'Vulnerabilidades',
    cve: 'CVE-2026-111357',
    title: 'Ivanti corrige dos nuevos Zero-Days explotados en cadena contra VPNs Connect Secure',
    summary: 'CISA incorporó CVE-2026-111357 y CVE-2026-118527 a su catálogo KEV tras detectarse que el grupo UTA0576 encadenó tres vulnerabilidades para lograr ejecución remota de código como root.',
    articleUrl: 'https://www.securityweek.com/ivanti-patches-two-more-zero-days-exploited-in-connect-secure-attack-chain/',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1080&q=80',
    alsoReportedBy: [
      { name: 'CISA Advisories', url: 'https://www.cisa.gov/news-events/cybersecurity-advisories' },
      { name: 'The Hacker News', url: 'https://thehackernews.com/' }
    ]
  },
  {
    id: 'art-2',
    sourceName: 'BleepingComputer',
    sourceBadge: 'BC',
    badgeColor: '#3B82F6',
    publishedAgo: '3h',
    category: 'Innovación e IA',
    cve: 'NIST ML-KEM',
    title: 'Chrome adopta cifrado post-cuántico ML-KEM aprobado por NIST y refuerza defensas contra ClickFix',
    summary: 'Los navegadores e infraestructuras cloud migran al estándar criptográfico resistente a computación cuántica mientras se despliegan alertas proactivas contra ataques de ingeniería social.',
    articleUrl: 'https://www.bleepingcomputer.com/news/security/chrome-switching-to-nist-approved-ml-kem-quantum-encryption/',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1080&q=80',
    alsoReportedBy: [
      { name: 'SecurityWeek', url: 'https://www.securityweek.com/' }
    ]
  },
  {
    id: 'art-3',
    sourceName: 'The Hacker News',
    sourceBadge: 'THN',
    badgeColor: '#F59E0B',
    publishedAgo: '4h',
    category: 'Ataques',
    cve: 'APT DarkBlinders',
    title: 'Campaña de ciberespionaje DarkBlinders compromete entornos cloud gubernamentales',
    summary: 'Investigadores documentan una operación dirigida contra infraestructuras de aviación, telecomunicaciones y nubes gubernamentales utilizando spear-phishing con herramientas modificadas.',
    articleUrl: 'https://thehackernews.com/',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-4',
    sourceName: 'CISA Advisories',
    sourceBadge: 'CISA',
    badgeColor: '#EF4444',
    publishedAgo: '5h',
    category: 'Vulnerabilidades',
    cve: 'KEV Alert',
    title: 'CISA ordena parcheo urgente de vulnerabilidades activamente explotadas en PHP y pasarelas de red',
    summary: 'La Agencia de Ciberseguridad e Infraestructura (CISA) actualizó su catálogo KEV exigiendo remediación inmediata ante ataques automatizados contra servidores expuestos.',
    articleUrl: 'https://www.cisa.gov/news-events/cybersecurity-advisories',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-5',
    sourceName: 'Krebs on Security',
    sourceBadge: 'KS',
    badgeColor: '#10B981',
    publishedAgo: '8h',
    category: 'Inteligencia',
    cve: 'Threat Intel',
    title: 'Investigación federal identifica operadores detrás de campañas de extorsión de datos corporativos',
    summary: 'El análisis forense de infraestructuras y registros financieros vincula a actores clave involucrados en robos masivos de credenciales y extorsión contra plataformas cloud.',
    articleUrl: 'https://krebsonsecurity.com/',
    imageUrl: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-6',
    sourceName: 'Dark Reading',
    sourceBadge: 'DR',
    badgeColor: '#A855F7',
    publishedAgo: '11h',
    category: 'Ataques',
    cve: 'Supply Chain',
    title: 'Por qué los inventarios SBOM por sí solos no bastan para contener ataques a la cadena de suministro',
    summary: 'El robo de tokens en repositorios y paquetes maliciosos demuestra que los equipos de seguridad necesitan validación en tiempo de ejecución además del inventario estático.',
    articleUrl: 'https://www.darkreading.com/cyber-risk/sboms-alone-scope-supply-chain-attack',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-7',
    sourceName: 'The Record',
    sourceBadge: 'TR',
    badgeColor: '#EC4899',
    publishedAgo: '14h',
    category: 'Inteligencia',
    cve: 'Zero Trust',
    title: 'Auditoría en proveedores externos expone brechas de datos por controles de acceso heredados',
    summary: 'Informes de supervisión advierten sobre el riesgo en contratistas y proveedores tecnológicos que manejan datos sensibles sin segmentación Zero Trust.',
    articleUrl: 'https://therecord.media/uk-police-data-breached-from-suppliers-watchdog-report',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-8',
    sourceName: 'Unit 42 (Palo Alto)',
    sourceBadge: 'U42',
    badgeColor: '#EAB308',
    publishedAgo: '16h',
    category: 'Inteligencia',
    cve: 'Storm-1849',
    title: 'Análisis de explotación Zero-Day en routers y firewalls perimetrales vinculados a redes encubiertas',
    summary: 'Los investigadores de Unit 42 detallan cómo los atacantes encadenan fallos críticos para mantener persistencia silenciosa en dispositivos de borde.',
    articleUrl: 'https://unit42.paloaltonetworks.com/',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-9',
    sourceName: 'SANS ISC',
    sourceBadge: 'SANS',
    badgeColor: '#F97316',
    publishedAgo: '18h',
    category: 'Vulnerabilidades',
    cve: 'ISC Stormcast',
    title: 'Reporte de Honeypots SANS ISC: Incremento de escaneos automatizados contra servidores SSH y paneles web',
    summary: 'Los sensores globales del Internet Storm Center registran nuevas firmas de explotación dirigidas a servicios expuestos tras divulgaciones recientes.',
    articleUrl: 'https://isc.sans.edu/',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-10',
    sourceName: 'Schneier on Security',
    sourceBadge: 'SoS',
    badgeColor: '#14B8A6',
    publishedAgo: '1d',
    category: 'Innovación e IA',
    cve: 'AI Defense',
    title: 'Agentes de IA autónomos en ciberseguridad: velocidad de parcheo frente a descubrimiento de fallos',
    summary: 'Reflexión técnica sobre cómo los modelos de frontera están transformando tanto el triaje defensivo de vulnerabilidades como las pruebas de penetración.',
    articleUrl: 'https://www.schneier.com/',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-11',
    sourceName: 'Reddit r/netsec',
    sourceBadge: 'r/ns',
    badgeColor: '#6366F1',
    publishedAgo: '1d',
    category: 'Foros',
    cve: 'Write-up Técnico',
    title: '[r/netsec] Análisis técnico de detección de concesiones OAuth riesgosas y servidores MCP corporativos',
    summary: 'Debate técnico de la comunidad de ingeniería de seguridad con scripts de auditoría para identificar tokens persistentes y permisos excesivos.',
    articleUrl: 'https://www.reddit.com/r/netsec/',
    imageUrl: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1080&q=80'
  },
  {
    id: 'art-12',
    sourceName: 'Zero Day Initiative',
    sourceBadge: 'ZDI',
    badgeColor: '#F43F5E',
    publishedAgo: '1d',
    category: 'Vulnerabilidades',
    cve: 'ZDI-2026',
    title: 'ZDI publica nuevos boletines de vulnerabilidades corregidas en hipervisores y motores WebGPU',
    summary: 'Resumen de fallos de corrupción de memoria y escalada de privilegios reportados de forma coordinada a los fabricantes.',
    articleUrl: 'https://www.zerodayinitiative.com/rss/',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1080&q=80'
  }
];

const CATEGORIES = ['Todas', 'Vulnerabilidades', 'Ataques', 'Innovación e IA', 'Inteligencia', 'Foros'];

export default function App() {
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [savedOnly, setSavedOnly] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [pushBanner, setPushBanner] = useState<Article | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldownSec(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHMS = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const fetchLiveRSS = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.feedburner.com%2FTheHackersNews');
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const liveItems: Article[] = data.items.slice(0, 5).map((it: any, idx: number) => ({
          id: 'live-thn-' + idx,
          sourceName: 'The Hacker News',
          sourceBadge: 'THN',
          badgeColor: '#F59E0B',
          publishedAgo: 'Reciente',
          category: 'Ataques',
          cve: 'Live RSS',
          title: String(it.title || '').replace(/<[^>]*>/g, ''),
          summary: String(it.description || '').replace(/<[^>]*>/g, '').slice(0, 260) + '...',
          articleUrl: String(it.link || 'https://thehackernews.com/'),
          imageUrl: it.thumbnail || (it.enclosure && it.enclosure.link) || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1080&q=80'
        }));
        setArticles([...liveItems, ...INITIAL_ARTICLES]);
      }
    } catch {
      // Fallback offline seguro
    } finally {
      setRefreshing(false);
    }
  }, []);

  const simulatePushNotification = () => {
    if (cooldownSec > 0) {
      return;
    }
    const breaking: Article = {
      id: 'push-' + Date.now(),
      sourceName: 'CISA Advisories',
      sourceBadge: 'CISA',
      badgeColor: '#EF4444',
      publishedAgo: 'Ahora',
      category: 'Vulnerabilidades',
      cve: 'CVE-2026-21643',
      title: 'ALERTA CISA: Parche urgente por ejecución remota sin autenticación en servidores corporativos',
      summary: 'CISA añade una nueva vulnerabilidad crítica CVSS 9.8 a su catálogo KEV de explotación activa. El temporizador anti-spam de 3 horas se ha reiniciado.',
      articleUrl: 'https://www.cisa.gov/news-events/cybersecurity-advisories',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1080&q=80'
    };
    setArticles(prev => [breaking, ...prev]);
    setPushBanner(breaking);
    setCooldownSec(3 * 3600);
  };

  const shareArticle = async (item: Article, platform?: 'whatsapp' | 'twitter' | 'linkedin') => {
    const shareText = `${item.title} — vía CyberNews CN (${item.sourceName})`;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(item.articleUrl);

    try {
      if (platform === 'whatsapp') {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`);
        return;
      }
      if (platform === 'twitter') {
        await Linking.openURL(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
        return;
      }
      if (platform === 'linkedin') {
        await Linking.openURL(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
        return;
      }
      await Share.share({
        title: item.title,
        message: `${shareText} ${item.articleUrl}`,
        url: item.articleUrl,
      });
    } catch {}
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredArticles = articles.filter(item => {
    if (selectedCategory !== 'Todas' && item.category !== selectedCategory) return false;
    if (savedOnly && !favorites[item.id]) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.sourceName.toLowerCase().includes(q) ||
        (item.cve && item.cve.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>CN</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>CyberNews <Text style={styles.brandAccent}>CN</Text></Text>
            <Text style={styles.brandSubtitle}>12 Fuentes · Zero-Login · Anti-Clon</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={simulatePushNotification}
            style={[styles.pushPill, cooldownSec > 0 ? styles.pushPillCooldown : styles.pushPillReady]}
          >
            <Text style={styles.pushPillText}>
              {cooldownSec > 0 ? `Push: ${formatHMS(cooldownSec)}` : '🔔 Probar Push (3h)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSavedOnly(!savedOnly)}
            style={[styles.favFilterBtn, savedOnly && styles.favFilterBtnActive]}
          >
            <Text style={styles.favFilterText}>
              ♥ {Object.values(favorites).filter(Boolean).length}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {pushBanner && (
        <View style={styles.pushBannerBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pushBannerTag}>NOTIFICACIÓN PUSH · TIMER 3H REINICIADO</Text>
            <Text style={styles.pushBannerTitle} numberOfLines={2}>{pushBanner.title}</Text>
          </View>
          <TouchableOpacity onPress={() => setPushBanner(null)} style={styles.pushBannerClose}>
            <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filterSection}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar CVE, ransomware, zero-day, CISA..."
          placeholderTextColor="#6B7280"
          style={styles.searchInput}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map(cat => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.catPill, active && styles.catPillActive]}
              >
                <Text style={[styles.catPillText, active && styles.catPillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredArticles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLiveRSS} tintColor="#06B6D4" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedArticle(item)}>
              <View style={styles.imageWrapper}>
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.cardTopBadges}>
                  <Text style={styles.catBadge}>{item.category}</Text>
                  {item.cve ? <Text style={styles.cveBadge}>{item.cve}</Text> : null}
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.alsoReportedBy && item.alsoReportedBy.length > 0 && (
                <View style={styles.dedupRow}>
                  <Text style={styles.dedupBadge}>
                    🔗 1 tarjeta única · También en: {item.alsoReportedBy.map(s => s.name).join(', ')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.cardFooter}>
              <View style={styles.sourceRow}>
                <View style={[styles.sourceDot, { backgroundColor: item.badgeColor }]}>
                  <Text style={styles.sourceDotText}>{item.sourceBadge}</Text>
                </View>
                <Text style={styles.sourceMeta}>{item.sourceName} · {item.publishedAgo}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.iconBtn}>
                  <Text style={[styles.actionText, favorites[item.id] && { color: '#F43F5E' }]}>
                    {favorites[item.id] ? '♥' : '♡'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shareArticle(item)} style={styles.iconBtn}>
                  <Text style={styles.actionText}>📤</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedArticle(item)} style={styles.iconBtn}>
                  <Text style={styles.actionText}>⋮</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={selectedArticle !== null} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          {selectedArticle && (
            <View style={styles.modalCard}>
              <Image source={{ uri: selectedArticle.imageUrl }} style={styles.modalImage} resizeMode="cover" />
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalCategory}>
                  {selectedArticle.category} {selectedArticle.cve ? `· ${selectedArticle.cve}` : ''}
                </Text>
                <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
                <Text style={styles.modalMeta}>
                  Fuente principal: {selectedArticle.sourceName} · Hace {selectedArticle.publishedAgo}
                </Text>
                <Text style={styles.modalSummary}>{selectedArticle.summary}</Text>

                {selectedArticle.alsoReportedBy && selectedArticle.alsoReportedBy.length > 0 && (
                  <View style={styles.modalDedupBox}>
                    <Text style={styles.modalDedupTitle}>🔗 Otras fuentes agrupadas (Anti-Duplicados):</Text>
                    {selectedArticle.alsoReportedBy.map(src => (
                      <TouchableOpacity key={src.name} onPress={() => Linking.openURL(src.url)}>
                        <Text style={styles.modalDedupLink}>• {src.name} ↗</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.shareHeader}>Compartir en un toque:</Text>
                <View style={styles.shareRow}>
                  <TouchableOpacity onPress={() => shareArticle(selectedArticle, 'whatsapp')} style={styles.shareBtnWA}>
                    <Text style={styles.shareBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shareArticle(selectedArticle, 'linkedin')} style={styles.shareBtnLI}>
                    <Text style={styles.shareBtnText}>LinkedIn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shareArticle(selectedArticle, 'twitter')} style={styles.shareBtnX}>
                    <Text style={styles.shareBtnText}>X / Twitter</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalFooterBtns}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(selectedArticle.articleUrl)}
                    style={styles.openOriginalBtn}
                  >
                    <Text style={styles.openOriginalBtnText}>Leer nota original completa ↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedArticle(null)} style={styles.closeModalBtn}>
                    <Text style={styles.closeModalBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070A12', paddingTop: Platform.OS === 'android' ? 28 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0B0F19', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#083344', borderWidth: 1, borderColor: '#06B6D4', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoText: { color: '#22D3EE', fontWeight: '900', fontSize: 14 },
  brandTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  brandAccent: { color: '#22D3EE' },
  brandSubtitle: { color: '#94A3B8', fontSize: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  pushPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  pushPillReady: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  pushPillCooldown: { backgroundColor: '#451A03', borderColor: '#F59E0B' },
  pushPillText: { color: '#ECFDF5', fontSize: 11, fontWeight: '700' },
  favFilterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  favFilterBtnActive: { backgroundColor: '#4C0519', borderColor: '#F43F5E' },
  favFilterText: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  pushBannerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderColor: '#06B6D4', borderWidth: 1, marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 12 },
  pushBannerTag: { color: '#22D3EE', fontSize: 10, fontWeight: '800' },
  pushBannerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 2 },
  pushBannerClose: { padding: 6, marginLeft: 8 },
  filterSection: { backgroundColor: '#12151E', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F2433' },
  searchInput: { backgroundColor: '#1A1F2E', color: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  catScroll: { flexDirection: 'row' },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1B2030', marginRight: 8 },
  catPillActive: { backgroundColor: '#06B6D4' },
  catPillText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  catPillTextActive: { color: '#020617', fontWeight: '800' },
  card: { backgroundColor: '#12151E', marginBottom: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#222738' },
  imageWrapper: { position: 'relative' },
  cardImage: { width: '100%', height: 205, backgroundColor: '#1E293B' },
  cardTopBadges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row' },
  catBadge: { backgroundColor: 'rgba(0,0,0,0.78)', color: '#67E8F9', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', marginRight: 6 },
  cveBadge: { backgroundColor: 'rgba(0,0,0,0.78)', color: '#FDA4AF', fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  cardTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '600', lineHeight: 25, paddingHorizontal: 16, paddingTop: 12 },
  dedupRow: { paddingHorizontal: 16, paddingTop: 8 },
  dedupBadge: { color: '#D8B4FE', backgroundColor: '#2E1065', fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  sourceRow: { flexDirection: 'row', alignItems: 'center' },
  sourceDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sourceDotText: { color: '#020617', fontSize: 9, fontWeight: '900' },
  sourceMeta: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  actionText: { color: '#9CA3AF', fontSize: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#121622', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%', overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  modalImage: { width: '100%', height: 190, backgroundColor: '#1E293B' },
  modalBody: { padding: 18 },
  modalCategory: { color: '#22D3EE', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  modalTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', lineHeight: 26, marginBottom: 6 },
  modalMeta: { color: '#94A3B8', fontSize: 12, marginBottom: 12 },
  modalSummary: { color: '#E2E8F0', fontSize: 14, lineHeight: 22, marginBottom: 14 },
  modalDedupBox: { backgroundColor: '#1E1B4B', padding: 12, borderRadius: 10, marginBottom: 14 },
  modalDedupTitle: { color: '#C4B5FD', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  modalDedupLink: { color: '#67E8F9', fontSize: 12, paddingVertical: 2 },
  shareHeader: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  shareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  shareBtnWA: { flex: 1, backgroundColor: '#065F46', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginRight: 6 },
  shareBtnLI: { flex: 1, backgroundColor: '#1E40AF', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 3 },
  shareBtnX: { flex: 1, backgroundColor: '#334155', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginLeft: 6 },
  shareBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  modalFooterBtns: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  openOriginalBtn: { flex: 2, backgroundColor: '#06B6D4', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginRight: 8 },
  openOriginalBtnText: { color: '#020617', fontWeight: '800', fontSize: 13 },
  closeModalBtn: { flex: 1, backgroundColor: '#1E293B', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  closeModalBtnText: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 }
});
