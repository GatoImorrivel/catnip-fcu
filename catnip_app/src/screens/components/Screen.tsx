import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function Screen({ style, ...props }: ViewProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.background }, style]}
      edges={['top', 'left', 'right']}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
});
