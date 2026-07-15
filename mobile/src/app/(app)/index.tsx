import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AuthRequiredError, isoDate } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { fetchBootstrap } from '@/lib/mobileApi';
import type { MobileBootstrap } from '@/lib/types';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export default function HomeScreen() {
  const theme = useTheme();
  const { session, signOut } = useSession();
  const [data, setData] = useState<MobileBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const payload = await fetchBootstrap();
      setData(payload);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        await signOut();
        return;
      }
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.');
    }
  }, [signOut]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const displayName = data?.user.displayName || session?.user.email || '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.headerText}>
              <ThemedText type="small" themeColor="textMuted">
                {greeting()}
              </ThemedText>
              <ThemedText type="default" numberOfLines={1}>
                {displayName}
              </ThemedText>
            </ThemedView>
            <Pressable onPress={signOut} hitSlop={Spacing.two}>
              <ThemedText type="small" themeColor="textSecondary">
                Abmelden
              </ThemedText>
            </Pressable>
          </ThemedView>

          {!data && !error ? (
            <ThemedView style={styles.loading}>
              <ActivityIndicator color={theme.accent} />
            </ThemedView>
          ) : null}

          {error ? (
            <ThemedView type="backgroundElement" style={styles.panel}>
              <ThemedText type="smallBold" themeColor="danger">
                Laden fehlgeschlagen
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
              <Pressable onPress={load}>
                <ThemedText type="smallBold" themeColor="accent">
                  Erneut versuchen
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          {data ? (
            <>
              <ThemedView type="backgroundElement" style={styles.panel}>
                <ThemedText type="smallBold">Mitteilungen</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {data.notifications.length === 0
                    ? 'Keine neuen Mitteilungen.'
                    : `${data.notifications.length} ${data.notifications.length === 1 ? 'Mitteilung' : 'Mitteilungen'} in den letzten 30 Tagen.`}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.sectionHeader}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Zuletzt aktualisiert
                </ThemedText>
              </ThemedView>

              {data.recentItems.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.panel}>
                  <ThemedText type="smallBold">Noch keine Objekte</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Sobald du dein erstes Objekt erfasst, erscheint es hier. Die Erfassung folgt in
                    der App — bis dahin über avareno.de.
                  </ThemedText>
                </ThemedView>
              ) : (
                data.recentItems.map((item) => (
                  <ThemedView
                    key={item.id}
                    type="backgroundElement"
                    style={[styles.panel, styles.itemRow, { borderColor: theme.border }]}>
                    <ThemedView style={styles.itemText}>
                      <ThemedText type="default" numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                        {[item.category, item.manufacturer].filter(Boolean).join(' · ') || 'Ohne Kategorie'}
                      </ThemedText>
                    </ThemedView>
                    <ThemedText type="small" themeColor="textMuted">
                      {isoDate(item.updatedAt)}
                    </ThemedText>
                  </ThemedView>
                ))
              )}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  loading: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  panel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sectionHeader: {
    marginTop: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    flexShrink: 1,
    gap: Spacing.half,
    backgroundColor: 'transparent',
  },
});
