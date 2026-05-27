import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import type { FcuSessionStatus } from '@/lib/fcu-connection-session';
import type { Characteristics } from '@/messages/types';

/** FCU session passed from {@link useCreateReplicaFcu} into mapping / verify steps. */
export type CreateReplicaFcuBinding = {
  characteristics: Characteristics | null;
  client: CatnipBleClient | null;
  ready: boolean;
  connectionStatus: FcuSessionStatus;
  error: string | null;
  reconnect: () => void;
};
