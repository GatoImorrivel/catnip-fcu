import { PostcardReader, uuidBytesToHex } from './codec';
import type {
  Characteristics,
  FireModeConfigFields,
  FireModePositionConfig,
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

export function decodeFireSelectorPositionReply(payload: Uint8Array): number {
  return new PostcardReader(payload).readU32();
}

export function decodeFireModeForPositionReply(payload: Uint8Array): FireModePositionConfig {
  return new PostcardReader(payload).readFireModeForPositionReply();
}

export function decodeSupportedFireModesReply(payload: Uint8Array): string[] {
  return new PostcardReader(payload).readSupportedFireModesReply();
}

export function decodeFireModeConfigFieldsReply(payload: Uint8Array): FireModeConfigFields {
  return new PostcardReader(payload).readFireModeConfigFields();
}

export function decodeUpdateFireModeConfigReply(
  payload: Uint8Array,
): UpdateFireModeConfigError | null {
  return new PostcardReader(payload).readUpdateFireModeConfigResult();
}
