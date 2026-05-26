import type {
  FireModeConfigFields,
  FireModeName,
  FireModePositionConfig,
} from '@/messages/types';
import { UpdateFireModeConfigError } from '@/messages/types';
import { useFcuRequest, type UseFcuRequestOptions, type UseFcuRequestResult } from './use-fcu-request';

export function useFcuFireSelectorPosition(
  peripheralId: string | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<number> {
  return useFcuRequest(
    peripheralId,
    (client) => client.getCurrentFireSelectorPosition(),
    options,
  );
}

export function useFcuFireModeForPosition(
  peripheralId: string | null,
  position: number | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireModePositionConfig> {
  return useFcuRequest(
    peripheralId,
    (client) => client.getFireModeForPosition(position!),
    {
      ...options,
      fetchEnabled: (options.fetchEnabled ?? true) && position !== null,
    },
  );
}

export function useFcuSupportedFireModes(
  peripheralId: string | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireModeName[]> {
  return useFcuRequest(peripheralId, (client) => client.getSupportedFireModes(), options);
}

export function useFcuFireModeConfigFields(
  peripheralId: string | null,
  firemodeName: FireModeName | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireModeConfigFields> {
  return useFcuRequest(
    peripheralId,
    (client) => client.getFireModeConfigFields(firemodeName!),
    {
      ...options,
      fetchEnabled: (options.fetchEnabled ?? true) && firemodeName !== null,
    },
  );
}

export function useFcuUpdateFireModeConfig(
  peripheralId: string | null,
  position: number | null,
  firemodeName: FireModeName | null,
  config: Record<string, string> | null,
  options: Omit<UseFcuRequestOptions, 'fetchEnabled'> & { fetchEnabled?: boolean } = {},
): UseFcuRequestResult<UpdateFireModeConfigError | null> & {
  update: () => Promise<void>;
} {
  const { fetchEnabled: autoFetch = false, ...rest } = options;

  const result = useFcuRequest(
    peripheralId,
    (client) =>
      client.updateFireModeConfig(position!, firemodeName!, config ?? {}),
    {
      ...rest,
      fetchEnabled:
        autoFetch && position !== null && firemodeName !== null && config !== null,
    },
  );

  const update = async () => {
    if (!result.client || position === null || firemodeName === null || config === null) {
      throw new Error('FCU not connected or fire mode parameters not set');
    }
    await result.refetch();
  };

  return { ...result, update };
}
