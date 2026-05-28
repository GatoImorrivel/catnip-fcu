import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function Screen({ style, children, ...props }: ViewProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.background }, style]}
      edges={['top', 'left', 'right']}
      {...props}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
  flex: {
    flex: 1,
  },
});
