import { PostcardWriter, uuidStringToBytes } from './codec';
import { FireMode, HOST_TO_FCU_REQUEST_VARIANT } from './types';

function writeRequestHeader(
  writer: PostcardWriter,
  variant: number,
  messageId: string,
): void {
  writer.writeU8(variant);
  writer.writeUuidBytes(uuidStringToBytes(messageId));
}

export function encodeGetCharacteristicsRequest(messageId: string): Uint8Array {
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.GetCharacteristcs, messageId);
  return writer.toUint8Array();
}

export function encodeGetFireModeConfigRequest(
  messageId: string,
  firemode: FireMode,
): Uint8Array {
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.GetFireModeConfig, messageId);
  writer.writeFireMode(firemode);
  return writer.toUint8Array();
}

export function encodeGetCurrentFireModeRequest(messageId: string): Uint8Array {
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.GetCurrentFireMode, messageId);
  return writer.toUint8Array();
}

export function encodeUpdateFireModeConfigRequest(
  messageId: string,
  firemode: FireMode,
): Uint8Array {
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.UpdateFireModeConfig, messageId);
  writer.writeFireMode(firemode);
  return writer.toUint8Array();
}
