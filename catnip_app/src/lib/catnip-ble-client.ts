import { getRandomBytes } from 'expo-crypto';
import type { EventSubscription } from 'react-native';

import {
  CATNIP_FCU_SERVICE_UUID,
  FCU_TO_HOST_UUID,
  HOST_TO_FCU_UUID,
} from '@/constants/ble';
import {
  decodeCharacteristicsReply,
  decodeFireModeConfigFieldsReply,
  decodeFireModeForPositionReply,
  decodeFireSelectorPositionReply,
  decodeSupportedFireModesReply,
  decodeUpdateFireModeConfigReply,
  splitReplyPacket,
} from '@/messages/replies';
import {
  encodeGetCharacteristicsRequest,
  encodeGetCurrentFireSelectorPositionRequest,
  encodeGetFireModeConfigFieldsRequest,
  encodeGetFireModeForPositionRequest,
  encodeGetSupportedFireModesRequest,
  encodeUpdateFireModeConfigRequest,
} from '@/messages/requests';
import {
  concatUint8Arrays,
  isPostcardIncomplete,
  OUTBOUND_TAG_EVENT,
  OUTBOUND_TAG_REPLY,
  PostcardReader,
} from '@/messages/codec';
import type {
  Characteristics,
  FCUToHostEvent,
  FireModeConfigFields,
  FireModeName,
  FireModePositionConfig,
} from '@/messages/types';
import {
  UpdateFireModeConfigError,
  type HostToFcuRequestVariant,
} from '@/messages/types';
import { BleManager } from './ble-manager';
import { CatnipBleNotReadyError, CatnipBleTimeoutError } from './catnip-ble-errors';
import { catnipBleLog } from './catnip-ble-log';

const REQUEST_TIMEOUT_MS = 3000;
const WRITE_MAX_BYTE_SIZE = 256;
/** ATT payload above default 20 B; avoids ESP truncating notify to MTU-3. */
const PREFERRED_MTU = 247;

type PendingRequest<T> = {
  method: HostToFcuRequestVariant;
  messageId: string;
  messageKey: string;
  decode: (payload: Uint8Array) => T;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

function normalizeUuid(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

function messageKeyFromId(messageId: string): string {
  return messageId.replace(/-/g, '').toLowerCase();
}

/** BLE request correlation id (RFC4122 v4). Uses `getRandomBytes` — native `randomUUID` is missing on some dev builds. */
function createBleMessageId(): string {
  const bytes = getRandomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function numbersToUint8Array(values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

async function negotiateMtu(peripheralId: string): Promise<number> {
  try {
    return await BleManager.requestMTU(peripheralId, PREFERRED_MTU);
  } catch {
    return 23;
  }
}

/**
 * Request/response BLE client for Catnip FCU GATT protocol.
 *
 * Correlates replies to requests via `message_id` and enforces a 3s deadline per call.
 */
export class CatnipBleClient {
  private readonly pending = new Map<string, PendingRequest<unknown>>();
  private notificationSubscription: EventSubscription | null = null;
  private notifyBuffer: Uint8Array = new Uint8Array(0);
  private closed = false;

  private constructor(private readonly peripheralId: string) {}

  static async connect(peripheralId: string): Promise<CatnipBleClient> {
    const client = new CatnipBleClient(peripheralId);
    const mtu = await client.setup();
    catnipBleLog.clientReady(peripheralId, mtu);
    return client;
  }

  get id(): string {
    return this.peripheralId;
  }

  private async setup(): Promise<number> {
    await BleManager.retrieveServices(this.peripheralId, [CATNIP_FCU_SERVICE_UUID]);
    const mtu = await negotiateMtu(this.peripheralId);

    this.notificationSubscription = BleManager.onDidUpdateValueForCharacteristic((event) => {
      if (event.peripheral !== this.peripheralId) {
        return;
      }
      if (normalizeUuid(event.characteristic) !== normalizeUuid(FCU_TO_HOST_UUID)) {
        return;
      }
      this.appendNotification(numbersToUint8Array(event.value));
    });

    await BleManager.startNotification(
      this.peripheralId,
      CATNIP_FCU_SERVICE_UUID,
      FCU_TO_HOST_UUID,
    );

    return mtu;
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.notifyBuffer = new Uint8Array(0);
    this.rejectAllPending(new CatnipBleNotReadyError('Catnip BLE client closed'));
    this.notificationSubscription?.remove();
    this.notificationSubscription = null;
    await BleManager.stopNotification(
      this.peripheralId,
      CATNIP_FCU_SERVICE_UUID,
      FCU_TO_HOST_UUID,
    ).catch(() => undefined);
    catnipBleLog.clientClosed(this.peripheralId);
  }

  async getCharacteristics(): Promise<Characteristics> {
    return this.request('GetCharacteristcs', (messageId) =>
      encodeGetCharacteristicsRequest(messageId),
    (payload) => decodeCharacteristicsReply(payload));
  }

  async getCurrentFireSelectorPosition(): Promise<number> {
    return this.request(
      'GetCurrentFireSelectorPosition',
      (messageId) => encodeGetCurrentFireSelectorPositionRequest(messageId),
      (payload) => decodeFireSelectorPositionReply(payload),
    );
  }

  async getFireModeForPosition(position: number): Promise<FireModePositionConfig> {
    return this.request(
      'GetFireModeForPosition',
      (messageId) => encodeGetFireModeForPositionRequest(messageId, position),
      (payload) => decodeFireModeForPositionReply(payload),
      { position },
    );
  }

  async getSupportedFireModes(): Promise<FireModeName[]> {
    return this.request(
      'GetSupportedFireModes',
      (messageId) => encodeGetSupportedFireModesRequest(messageId),
      (payload) => decodeSupportedFireModesReply(payload),
    );
  }

  async getFireModeConfigFields(firemodeName: FireModeName): Promise<FireModeConfigFields> {
    return this.request(
      'GetFireModeConfigFields',
      (messageId) => encodeGetFireModeConfigFieldsRequest(messageId, firemodeName),
      (payload) => decodeFireModeConfigFieldsReply(payload),
      { firemodeName },
    );
  }

  async updateFireModeConfig(
    position: number,
    firemodeName: FireModeName,
    config: Record<string, string>,
  ): Promise<UpdateFireModeConfigError | null> {
    return this.request(
      'UpdateFireModeConfig',
      (messageId) =>
        encodeUpdateFireModeConfigRequest(messageId, position, firemodeName, config),
      (payload) => decodeUpdateFireModeConfigReply(payload),
      { position, firemodeName },
    );
  }

  private async request<T>(
    method: HostToFcuRequestVariant,
    encode: (messageId: string) => Uint8Array,
    decode: (payload: Uint8Array) => T,
    extra?: Record<string, unknown>,
  ): Promise<T> {
    if (this.closed) {
      throw new CatnipBleNotReadyError();
    }

    const messageId = createBleMessageId();
    const messageKey = messageKeyFromId(messageId);
    const payload = encode(messageId);

    catnipBleLog.requestSent(this.peripheralId, method, messageId, payload, extra);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageKey);
        catnipBleLog.requestTimeout(
          this.peripheralId,
          method,
          messageId,
          REQUEST_TIMEOUT_MS,
        );
        reject(new CatnipBleTimeoutError());
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(messageKey, {
        method,
        messageId,
        messageKey,
        decode,
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      void this.writeRequest(payload).catch((error: unknown) => {
        clearTimeout(timer);
        this.pending.delete(messageKey);
        const err = error instanceof Error ? error : new Error(String(error));
        catnipBleLog.requestFailed(this.peripheralId, method, messageId, err);
        reject(err);
      });
    });
  }

  private async writeRequest(payload: Uint8Array): Promise<void> {
    await BleManager.write(
      this.peripheralId,
      CATNIP_FCU_SERVICE_UUID,
      HOST_TO_FCU_UUID,
      Array.from(payload),
      WRITE_MAX_BYTE_SIZE,
    );
  }

  private appendNotification(chunk: Uint8Array): void {
    if (chunk.length === 0) {
      return;
    }
    this.notifyBuffer = concatUint8Arrays(this.notifyBuffer, chunk);
    this.drainNotifyBuffer();
  }

  private drainNotifyBuffer(): void {
    while (this.notifyBuffer.length > 0) {
      const consumed = this.tryProcessFrame(this.notifyBuffer);
      if (consumed === 0) {
        return;
      }
      this.notifyBuffer = this.notifyBuffer.subarray(consumed);
    }
  }

  /** Returns bytes consumed from the front of `data`, or 0 if more data is needed. */
  private tryProcessFrame(data: Uint8Array): number {
    if (data.length === 0) {
      return 0;
    }

    const tag = data[0]!;
    const body = data.subarray(1);

    if (tag === OUTBOUND_TAG_REPLY) {
      return this.tryProcessReplyFrame(data, body);
    }

    if (tag === OUTBOUND_TAG_EVENT) {
      return this.tryProcessEventFrame(data, body);
    }

    catnipBleLog.unknownFrame(this.peripheralId, tag, data.length);
    return 1;
  }

  private tryProcessReplyFrame(frame: Uint8Array, body: Uint8Array): number {
    let header;
    try {
      header = splitReplyPacket(body);
    } catch (error: unknown) {
      if (isPostcardIncomplete(error)) {
        return 0;
      }
      catnipBleLog.decodeError(this.peripheralId, 'reply packet', error);
      return frame.length;
    }

    const pending = this.pending.get(header.messageId);
    if (!pending) {
      catnipBleLog.orphanReply(this.peripheralId, header.messageId, body.length);
      return frame.length;
    }

    try {
      const decoded = pending.decode(header.payload);
      clearTimeout(pending.timer);
      this.pending.delete(pending.messageKey);
      catnipBleLog.replyReceived(
        this.peripheralId,
        pending.method,
        pending.messageId,
        decoded,
        frame.length,
      );
      pending.resolve(decoded);
      return frame.length;
    } catch (error: unknown) {
      if (isPostcardIncomplete(error)) {
        return 0;
      }
      clearTimeout(pending.timer);
      this.pending.delete(pending.messageKey);
      const err = error instanceof Error ? error : new Error(String(error));
      catnipBleLog.decodeError(this.peripheralId, `${pending.method} reply body`, err);
      pending.reject(err);
      return frame.length;
    }
  }

  private tryProcessEventFrame(frame: Uint8Array, body: Uint8Array): number {
    try {
      const event = new PostcardReader(body).readFcuToHostEvent();
      catnipBleLog.eventReceived(this.peripheralId, event, frame.length);
      this.onEvent?.(event);
      return frame.length;
    } catch (error: unknown) {
      if (isPostcardIncomplete(error)) {
        return 0;
      }
      catnipBleLog.decodeError(this.peripheralId, 'event', error);
      return frame.length;
    }
  }

  /** Optional hook for push events (selector / fire mode changes, trigger pull). */
  onEvent?: (event: FCUToHostEvent) => void;

  private rejectAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      catnipBleLog.requestFailed(
        this.peripheralId,
        pending.method,
        pending.messageId,
        error,
      );
      pending.reject(error);
    }
    this.pending.clear();
  }
}
