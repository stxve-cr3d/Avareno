import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/auth';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, configured } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSignIn() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setSubmitting(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="subtitle" style={styles.brand} themeColor="accent">
            Avareno
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.tagline}>
            Dein Zuhause, gut erinnert.
          </ThemedText>

          {!configured ? (
            <ThemedView type="backgroundElement" style={styles.setupBox}>
              <ThemedText type="smallBold">Einrichtung erforderlich</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in mobile/.env
                setzen und die App neu starten.
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="E-Mail"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Passwort"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSignIn}
              />

              {error ? (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              ) : null}

              <Pressable
                onPress={handleSignIn}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: theme.buttonPrimaryBg,
                    borderColor: theme.borderMedium,
                    opacity: !canSubmit || pressed ? 0.6 : 1,
                  },
                ]}>
                {submitting ? (
                  <ActivityIndicator color={theme.buttonPrimaryText} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.buttonPrimaryText }}>
                    Anmelden
                  </ThemedText>
                )}
              </Pressable>

              <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
                Noch kein Konto? Registrierung aktuell über avareno.de.
              </ThemedText>
            </>
          )}
        </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  brand: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  setupBox: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
  },
});
