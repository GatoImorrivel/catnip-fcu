import type { FireMode, FireModeConfigFields } from '@/messages/types';
import { UpdateFireModeConfigError } from '@/messages/types';
import { useFcuRequest, type UseFcuRequestOptions, type UseFcuRequestResult } from './use-fcu-request';

export function useFcuCurrentFireMode(
  peripheralId: string | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireMode> {
  return useFcuRequest(peripheralId, (client) => client.getCurrentFireMode(), options);
}

export function useFcuFireModeConfig(
  peripheralId: string | null,
  firemode: FireMode | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireModeConfigFields | null> {
  return useFcuRequest(
    peripheralId,
    (client) => client.getFireModeConfig(firemode!),
    {
      ...options,
      fetchEnabled: (options.fetchEnabled ?? true) && firemode !== null,
    },
  );
}

export function useFcuUpdateFireModeConfig(
  peripheralId: string | null,
  firemode: FireMode | null,
  options: Omit<UseFcuRequestOptions, 'fetchEnabled'> & { fetchEnabled?: boolean } = {},
): UseFcuRequestResult<UpdateFireModeConfigError | null> & {
  update: () => Promise<void>;
} {
  const { fetchEnabled: autoFetch = false, ...rest } = options;

  const result = useFcuRequest(
    peripheralId,
    (client) => client.updateFireModeConfig(firemode!),
    {
      ...rest,
      fetchEnabled: autoFetch && firemode !== null,
    },
  );

  const update = async () => {
    if (!result.client || firemode === null) {
      throw new Error('FCU not connected or fire mode not set');
    }
    await result.refetch();
  };

  return { ...result, update };
}
