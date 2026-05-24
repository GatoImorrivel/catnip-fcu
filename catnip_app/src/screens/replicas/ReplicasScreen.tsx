import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/screens/components';

export function ReplicasScreen() {
  const router = useRouter();
  const { theme, colorScheme, toggleColorScheme } = useTheme();

  const nextScheme = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Replicas</Text>
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={() => router.push('/replicas/select-fcu')}
          accessibilityRole="button"
          accessibilityLabel="Add replica"
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <MaterialIcons name="add" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Pressable
          onPress={toggleColorScheme}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${nextScheme} mode`}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <MaterialIcons
            name={colorScheme === 'dark' ? 'light-mode' : 'dark-mode'}
            size={22}
            color={theme.colors.foreground}
          />
        </Pressable>
      </View>
      <View style={styles.content} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSpacer: {
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
});
