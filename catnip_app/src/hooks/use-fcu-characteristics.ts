import type { Characteristics } from '@/messages/types';
import { useFcuRequest, type UseFcuRequestOptions, type UseFcuRequestResult } from './use-fcu-request';

export type UseFcuCharacteristicsOptions = UseFcuRequestOptions;

export type UseFcuCharacteristicsResult = UseFcuRequestResult<Characteristics> & {
  characteristics: Characteristics | null;
};

/**
 * Connects to an FCU by peripheral id and fetches {@link Characteristics} when ready.
 */
export function useFcuCharacteristics(
  peripheralId: string | null,
  options: UseFcuCharacteristicsOptions = {},
): UseFcuCharacteristicsResult {
  const result = useFcuRequest(
    peripheralId,
    (client) => client.getCharacteristics(),
    options,
  );

  return {
    ...result,
    characteristics: result.data,
  };
}
