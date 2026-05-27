import type { ComponentProps } from 'react';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LiveFireSelectorPanel } from '@/components/fire-selector/LiveFireSelectorPanel';

type LiveFireSelectorPanelProps = ComponentProps<typeof LiveFireSelectorPanel>;

export type ResponsiveLiveFireSelectorPanelProps = Omit<
  LiveFireSelectorPanelProps,
  'graphicSize' | 'maxGraphicWidth' | 'maxGraphicHeight' | 'layout' | 'onGraphicAreaLayout'
> & {
  layout?: 'default' | 'compact' | 'fill';
};

export function ResponsiveLiveFireSelectorPanel({
  replicaType,
  layout = 'fill',
  ...panelProps
}: ResponsiveLiveFireSelectorPanelProps) {
  const [graphicAreaWidth, setGraphicAreaWidth] = useState(0);
  const [graphicAreaHeight, setGraphicAreaHeight] = useState(0);

  const handleGraphicAreaLayout = useCallback((width: number, height: number) => {
    setGraphicAreaWidth(width);
    setGraphicAreaHeight(height);
  }, []);

  return (
    <View style={styles.container}>
      <LiveFireSelectorPanel
        {...panelProps}
        replicaType={replicaType}
        layout={layout}
        maxGraphicWidth={graphicAreaWidth > 0 ? graphicAreaWidth : undefined}
        maxGraphicHeight={graphicAreaHeight > 0 ? graphicAreaHeight : undefined}
        onGraphicAreaLayout={handleGraphicAreaLayout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
