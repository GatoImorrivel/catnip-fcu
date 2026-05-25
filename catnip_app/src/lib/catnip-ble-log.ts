import {
  FireMode,
  UpdateFireModeConfigError,
  type Characteristics,
  type FCUToHostEvent,
  type FireModeConfigFields,
  type HostToFcuRequestVariant,
} from '@/messages/types';

const LOG_STYLE =
  'color:#a78bfa;font-weight:600';
const LOG_STYLE_DIM = 'color:#94a3b8;font-weight:400';

let loggingEnabled = __DEV__;

/** Toggle BLE traffic logs (default: on in development builds). */
export function setCatnipBleLoggingEnabled(enabled: boolean): void {
  loggingEnabled = enabled;
}

export function isCatnipBleLoggingEnabled(): boolean {
  return loggingEnabled;
}

const FIRE_MODE_NAMES: Record<FireMode, string> = {
  [FireMode.Safe]: 'Safe',
  [FireMode.FullAuto]: 'FullAuto',
  [FireMode.SemiAuto]: 'SemiAuto',
  [FireMode.Burst]: 'Burst',
};

const UPDATE_ERROR_NAMES: Record<UpdateFireModeConfigError, string> = {
  [UpdateFireModeConfigError.InvalidConfig]: 'InvalidConfig',
  [UpdateFireModeConfigError.UnsupportedFireMode]: 'UnsupportedFireMode',
};

function shortId(messageId: string): string {
  const hex = messageId.replace(/-/g, '').toLowerCase();
  return hex.length > 8 ? `${hex.slice(0, 8)}…` : hex;
}

function formatBytes(data: Uint8Array, max = 48): string {
  const slice = data.length > max ? data.subarray(0, max) : data;
  const hex = Array.from(slice, (b) => b.toString(16).padStart(2, '0')).join(' ');
  return data.length > max ? `${hex} … (+${data.length - max} B)` : hex;
}

function formatFcuKind(kind: Characteristics['kind']): string {
  return kind.tag === 'AEG' ? 'AEG' : `HPA(solenoids=${kind.num_solenoids})`;
}

function formatFireMode(mode: FireMode): string {
  return FIRE_MODE_NAMES[mode] ?? `FireMode(${mode})`;
}

export function formatCharacteristics(chars: Characteristics): Record<string, unknown> {
  return {
    name: chars.name,
    kind: formatFcuKind(chars.kind),
    num_fire_positions: chars.num_fire_positions,
    supported_firemodes: chars.supported_firemodes.map(formatFireMode),
  };
}

export function formatFireModeConfig(
  config: FireModeConfigFields | null,
): Record<string, unknown> | null {
  if (config === null) {
    return null;
  }
  return {
    field_count: config.length,
    fields: config.map((field) => Object.keys(field)),
  };
}

export function formatReplyBody(
  method: HostToFcuRequestVariant,
  body: unknown,
): unknown {
  switch (method) {
    case 'GetCharacteristcs':
      return formatCharacteristics(body as Characteristics);
    case 'GetFireModeConfig':
      return formatFireModeConfig(body as FireModeConfigFields | null);
    case 'GetCurrentFireMode':
      return { firemode: formatFireMode(body as FireMode) };
    case 'UpdateFireModeConfig': {
      const err = body as UpdateFireModeConfigError | null;
      return err === null ? null : { error: UPDATE_ERROR_NAMES[err] ?? err };
    }
    default:
      return body;
  }
}

export function formatFcuEvent(event: FCUToHostEvent): Record<string, unknown> {
  if (event.tag === 'FireModeChange') {
    return { event: 'FireModeChange', firemode: formatFireMode(event.firemode) };
  }
  return { event: 'TriggerPull' };
}

function logGroup(
  direction: '→' | '←' | '•',
  title: string,
  details: Record<string, unknown>,
): void {
  if (!loggingEnabled) {
    return;
  }

  console.groupCollapsed(
    `%c[Catnip BLE]%c ${direction} ${title}`,
    LOG_STYLE,
    LOG_STYLE_DIM,
  );
  console.log(details);
  console.groupEnd();
}

export const catnipBleLog = {
  clientReady(peripheralId: string, mtu?: number): void {
    logGroup('•', 'client ready', { peripheral: peripheralId, mtu });
  },

  clientClosed(peripheralId: string): void {
    logGroup('•', 'client closed', { peripheral: peripheralId });
  },

  requestSent(
    peripheralId: string,
    method: HostToFcuRequestVariant,
    messageId: string,
    payload: Uint8Array,
    extra?: Record<string, unknown>,
  ): void {
    logGroup('→', method, {
      peripheral: peripheralId,
      message_id: messageId,
      message_id_short: shortId(messageId),
      bytes: payload.length,
      wire: formatBytes(payload),
      ...extra,
    });
  },

  replyReceived(
    peripheralId: string,
    method: HostToFcuRequestVariant,
    messageId: string,
    body: unknown,
    wireLength: number,
  ): void {
    logGroup('←', `${method} reply`, {
      peripheral: peripheralId,
      message_id: messageId,
      message_id_short: shortId(messageId),
      bytes: wireLength,
      body: formatReplyBody(method, body),
    });
  },

  eventReceived(peripheralId: string, event: FCUToHostEvent, wireLength: number): void {
    logGroup('←', 'event', {
      peripheral: peripheralId,
      bytes: wireLength,
      ...formatFcuEvent(event),
    });
  },

  orphanReply(peripheralId: string, messageId: string, wireLength: number): void {
    if (!loggingEnabled) {
      return;
    }
    console.warn(
      `%c[Catnip BLE]%c ? orphan reply (no pending request)`,
      LOG_STYLE,
      LOG_STYLE_DIM,
      { peripheral: peripheralId, message_id: messageId, bytes: wireLength },
    );
  },

  requestTimeout(
    peripheralId: string,
    method: HostToFcuRequestVariant,
    messageId: string,
    timeoutMs: number,
  ): void {
    if (!loggingEnabled) {
      return;
    }
    console.warn(
      `%c[Catnip BLE]%c ! ${method} timed out`,
      LOG_STYLE,
      LOG_STYLE_DIM,
      {
        peripheral: peripheralId,
        message_id: messageId,
        message_id_short: shortId(messageId),
        timeout_ms: timeoutMs,
      },
    );
  },

  requestFailed(
    peripheralId: string,
    method: HostToFcuRequestVariant,
    messageId: string,
    error: Error,
  ): void {
    if (!loggingEnabled) {
      return;
    }
    console.warn(
      `%c[Catnip BLE]%c ! ${method} failed`,
      LOG_STYLE,
      LOG_STYLE_DIM,
      {
        peripheral: peripheralId,
        message_id: messageId,
        message_id_short: shortId(messageId),
        error: error.message,
      },
    );
  },

  decodeError(peripheralId: string, context: string, error: unknown): void {
    if (!loggingEnabled) {
      return;
    }
    console.warn(
      `%c[Catnip BLE]%c ! decode error`,
      LOG_STYLE,
      LOG_STYLE_DIM,
      {
        peripheral: peripheralId,
        context,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  },

  unknownFrame(peripheralId: string, tag: number, wireLength: number): void {
    if (!loggingEnabled) {
      return;
    }
    console.warn(
      `%c[Catnip BLE]%c ? unknown frame tag`,
      LOG_STYLE,
      LOG_STYLE_DIM,
      { peripheral: peripheralId, tag, bytes: wireLength },
    );
  },
};
