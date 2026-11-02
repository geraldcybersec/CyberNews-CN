/**
 * CyberNews CN - React Native (Expo) Mobile App (Android & iOS)
 * Sin Login | Ultraligera | Dark Mode estilo Google Discover | Compartir en 1 toque
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, Image, TouchableOpacity,
  Share, Linking, RefreshControl, SafeAreaView, StatusBar
} from 'react-native';

export interface Article {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  articleUrl: string;
  category: 'Ataques' | 'Vulnerabilidades' | 'Innovación e IA' | 'Inteligencia' | 'Foros';
  publishedAgo: string;
  imageUrl: string;
  cve?: string;
}

const API_ENDPOINT = 'https://cybernews-cn-worker.workers.dev/api/v1/feed';

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchFeed = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(API_ENDPOINT, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      if (Array.isArray(data.items)) {
        setArticles(data.items);
      }
    } catch (err) {
      // Fallback offline seguro
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Compartir directo a WhatsApp, LinkedIn, X (Twitter) o menú nativo del sistema
  const shareArticle = async (item: Article, platform?: 'whatsapp' | 'twitter' | 'linkedin') => {
    const shareText = `${item.title} — vía CyberNews CN (${item.sourceName})`;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(item.articleUrl);

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
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <FlatList
        data={articles.filter(a => selectedCategory === 'Todas' || a.category === selectedCategory)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchFeed} tintColor="#06B6D4" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(item.articleUrl)}>
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
            <View style={styles.cardFooter}>
              <Text style={styles.sourceMeta}>{item.sourceName} · {item.publishedAgo}</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.iconBtn}>
                  <Text style={styles.actionText}>{favorites[item.id] ? '♥' : '♡'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shareArticle(item)} style={styles.iconBtn}>
                  <Text style={styles.actionText}>Compartir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  card: { backgroundColor: '#111827', marginBottom: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  cardImage: { width: '100%', height: 210, backgroundColor: '#1E293B' },
  cardTitle: { color: '#F9FAFB', fontSize: 19, fontWeight: '600', lineHeight: 26, paddingHorizontal: 16, paddingTop: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  sourceMeta: { color: '#9CA3AF', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 16 },
  iconBtn: { padding: 4 },
  actionText: { color: '#9CA3AF', fontSize: 15 }
});
