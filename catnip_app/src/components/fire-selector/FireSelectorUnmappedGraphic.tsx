import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const UNMAPPED_MESSAGE = 'This position is not mapped to your replica.';

type FireSelectorUnmappedGraphicProps = {
  /** Scales the question mark; pass the same size used for the live selector graphic. */
  size?: number;
  style?: ViewStyle;
};

export function FireSelectorUnmappedGraphic({
  size = 160,
  style,
}: FireSelectorUnmappedGraphicProps) {
  const { theme } = useTheme();
  const markSize = Math.max(48, Math.round(size * 0.5));

  return (
    <View style={[styles.stack, style]}>
      <Text
        style={[styles.mark, { color: theme.colors.foreground, fontSize: markSize, lineHeight: markSize }]}
      >
        ?
      </Text>
      <Text style={[styles.message, { color: theme.colors.muted }]}>{UNMAPPED_MESSAGE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 280,
    gap: 8,
  },
  mark: {
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
