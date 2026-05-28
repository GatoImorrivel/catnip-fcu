import { PostcardWriter, uuidStringToBytes } from './codec';
import { assertNonNegativeIntegerFcuPosition } from './position';
import { HOST_TO_FCU_REQUEST_VARIANT } from './types';

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

export function encodeGetCurrentFireSelectorPositionRequest(messageId: string): Uint8Array {
  const writer = new PostcardWriter();
  writeRequestHeader(
    writer,
    HOST_TO_FCU_REQUEST_VARIANT.GetCurrentFireSelectorPosition,
    messageId,
  );
  return writer.toUint8Array();
}

export function encodeGetFireModeForPositionRequest(
  messageId: string,
  position: number,
): Uint8Array {
  assertNonNegativeIntegerFcuPosition(position);
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.GetFireModeForPosition, messageId);
  writer.writeU32(position);
  return writer.toUint8Array();
}

export function encodeGetSupportedFireModesRequest(messageId: string): Uint8Array {
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.GetSupportedFireModes, messageId);
  return writer.toUint8Array();
}

export function encodeGetFireModeConfigFieldsRequest(
  messageId: string,
  firemodeName: string,
): Uint8Array {
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.GetFireModeConfigFields, messageId);
  writer.writeString(firemodeName);
  return writer.toUint8Array();
}

export function encodeUpdateFireModeConfigRequest(
  messageId: string,
  position: number,
  firemodeName: string,
  config: Record<string, string>,
): Uint8Array {
  assertNonNegativeIntegerFcuPosition(position);
  const writer = new PostcardWriter();
  writeRequestHeader(writer, HOST_TO_FCU_REQUEST_VARIANT.UpdateFireModeConfig, messageId);
  writer.writeU32(position);
  writer.writeString(firemodeName);
  writer.writeHashMapStringString(config);
  return writer.toUint8Array();
}
