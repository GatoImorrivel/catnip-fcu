import { LiveFireSelectorPanel } from '@/components/fire-selector/LiveFireSelectorPanel';
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
    <LiveFireSelectorPanel
      replicaType={replicaType}
      peripheralId={peripheralId}
      mapping={mapping}
      hint="Move your fire selector through each position and confirm the graphic matches your replica."
    />
  );
}
