import { PostcardReader, uuidBytesToHex } from './codec';
import type {
  Characteristics,
  FireMode,
  FireModeConfigFields,
} from './types';
import { UpdateFireModeConfigError } from './types';

export type ReplyPacketHeader = {
  messageId: string;
  payload: Uint8Array;
};

export function splitReplyPacket(data: Uint8Array): ReplyPacketHeader {
  const reader = new PostcardReader(data);
  const messageIdBytes = reader.readUuidBytes();
  return {
    messageId: uuidBytesToHex(messageIdBytes),
    payload: data.subarray(reader.position),
  };
}

export function decodeCharacteristicsReply(payload: Uint8Array): Characteristics {
  return new PostcardReader(payload).readCharacteristics();
}

export function decodeFireModeReply(payload: Uint8Array): FireMode {
  return new PostcardReader(payload).readFireMode();
}

export function decodeOptionalFireModeConfigReply(
  payload: Uint8Array,
): FireModeConfigFields | null {
  const reader = new PostcardReader(payload);
  return reader.readOption(() => reader.readFireModeConfigFields());
}

export function decodeUpdateFireModeConfigReply(
  payload: Uint8Array,
): UpdateFireModeConfigError | null {
  const reader = new PostcardReader(payload);
  return reader.readOption(() => reader.readUpdateFireModeConfigError());
}
