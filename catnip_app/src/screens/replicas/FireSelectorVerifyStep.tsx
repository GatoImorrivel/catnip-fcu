import { StyleSheet, View } from 'react-native';

import { ResponsiveLiveFireSelectorPanel } from '@/components/fire-selector/ResponsiveLiveFireSelectorPanel';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';

type FireSelectorVerifyStepProps = {
  replicaType: ReplicaType;
  peripheralId: string;
  mapping: SelectorPositionMappingEntry[];
};

export function FireSelectorVerifyStep({
  replicaType,
  peripheralId,
  mapping,
}: FireSelectorVerifyStepProps) {
  return (
    <View style={styles.container}>
      <ResponsiveLiveFireSelectorPanel
        replicaType={replicaType}
        peripheralId={peripheralId}
        mapping={mapping}
        layout="fill"
        hint="Move your fire selector and confirm the graphic matches each orientation on your replica."
        captionMode="none"
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
