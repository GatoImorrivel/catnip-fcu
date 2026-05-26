/**
 * Postcard encode/decode — keep in sync with `catnip_core` serde types and
 * `catnip_esp32::bt_transport` frame tags (`OUTBOUND_TAG_REPLY` / `OUTBOUND_TAG_EVENT`).
 */
import {
  FireModeConfigTypeUnit,
  type FCUKind,
  type FCUToHostEvent,
  type FireModeConfigSchemaEntry,
  UpdateFireModeConfigError,
} from './types';

/** Matches `catnip_messages::codec::OUTBOUND_TAG_REPLY`. */
export const OUTBOUND_TAG_REPLY = 1;
/** Matches `catnip_messages::codec::OUTBOUND_TAG_EVENT`. */
export const OUTBOUND_TAG_EVENT = 2;

export class PostcardDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostcardDecodeError';
  }
}

export class PostcardReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  get remaining(): number {
    return this.data.length - this.offset;
  }

  get position(): number {
    return this.offset;
  }

  readU8(): number {
    return this.readVarintU32();
  }

  readU16(): number {
    return this.readVarintU32();
  }

  readU32(): number {
    return this.readVarintU32();
  }

  readI32(): number {
    const zz = this.readVarintU32();
    return (zz >>> 1) ^ -(zz & 1);
  }

  readBool(): boolean {
    const value = this.readU8();
    if (value > 1) {
      throw new PostcardDecodeError(`invalid bool ${value}`);
    }
    return value === 1;
  }

  readString(): string {
    const length = this.readVarintU32();
    const bytes = this.readBytes(length);
    return new TextDecoder().decode(bytes);
  }

  /** Matches serde/postcard encoding of `uuid::Uuid` (length-prefixed 16 bytes). */
  readUuidBytes(): Uint8Array {
    const length = this.readVarintU32();
    if (length !== 16) {
      throw new PostcardDecodeError(`invalid UUID byte length ${length}`);
    }
    return this.readBytes(16);
  }

  readOption<T>(readSome: () => T): T | null {
    const tag = this.readU8();
    if (tag === 0) {
      return null;
    }
    if (tag !== 1) {
      throw new PostcardDecodeError(`invalid option tag ${tag}`);
    }
    return readSome();
  }

  readVec<T>(readItem: () => T): T[] {
    const length = this.readVarintU32();
    const items: T[] = [];
    for (let i = 0; i < length; i++) {
      items.push(readItem());
    }
    return items;
  }

  readMap<T>(readEntry: () => T): T[] {
    return this.readVec(readEntry);
  }

  readHashMapStringString(): Record<string, string> {
    const entries = this.readMap(() => {
      const key = this.readString();
      const value = this.readString();
      return [key, value] as const;
    });
    return Object.fromEntries(entries);
  }

  readFcuKind(): FCUKind {
    const variant = this.readU8();
    if (variant === 0) {
      return { tag: 'HPA', num_solenoids: this.readU8() };
    }
    if (variant === 1) {
      return { tag: 'AEG' };
    }
    throw new PostcardDecodeError(`invalid FCUKind ${variant}`);
  }

  readCharacteristics() {
    const num_fire_positions = this.readU8();
    const name = this.readString();
    const kind = this.readFcuKind();
    return { num_fire_positions, name, kind };
  }

  readFireModeConfigSchemaEntry(): FireModeConfigSchemaEntry {
    const variant = this.readU8();
    if (variant === 0) {
      const display_name = this.readString();
      const min = this.readI32();
      const max = this.readI32();
      const defaultValue = this.readOption(() => this.readI32());
      const unit = this.readU8() as FireModeConfigTypeUnit;
      return {
        tag: 'Numeric',
        display_name,
        min,
        max,
        default: defaultValue,
        unit,
      };
    }
    if (variant === 1) {
      const display_name = this.readString();
      const defaultValue = this.readOption(() => this.readBool());
      return {
        tag: 'Boolean',
        display_name,
        default: defaultValue,
      };
    }
    throw new PostcardDecodeError(`invalid FireModeConfigSchemaEntry ${variant}`);
  }

  readFireModeConfigField(): Record<string, FireModeConfigSchemaEntry> {
    const entries = this.readMap(() => {
      const key = this.readString();
      const value = this.readFireModeConfigSchemaEntry();
      return [key, value] as const;
    });
    return Object.fromEntries(entries);
  }

  readFireModeConfigFields() {
    return this.readVec(() => this.readFireModeConfigField());
  }

  readFireModeForPositionReply(): { firemode_name: string; config: Record<string, string> } {
    const firemode_name = this.readString();
    const config = this.readHashMapStringString();
    return { firemode_name, config };
  }

  readSupportedFireModesReply(): string[] {
    return this.readVec(() => this.readString());
  }

  readUpdateFireModeConfigResult(): UpdateFireModeConfigError | null {
    const variant = this.readU8();
    if (variant === 0) {
      return null;
    }
    if (variant === 1) {
      const errVariant = this.readU8();
      if (errVariant < 0 || errVariant > 1) {
        throw new PostcardDecodeError(`invalid UpdateFireModeConfigError ${errVariant}`);
      }
      return errVariant as UpdateFireModeConfigError;
    }
    throw new PostcardDecodeError(`invalid Result tag ${variant}`);
  }

  readFcuToHostEvent(): FCUToHostEvent {
    const variant = this.readU8();
    if (variant === 0) {
      return { tag: 'SelectorPositionChange', position: this.readU32() };
    }
    if (variant === 1) {
      return { tag: 'FireModeChange', firemode_name: this.readString() };
    }
    if (variant === 2) {
      return { tag: 'TriggerPull' };
    }
    throw new PostcardDecodeError(`invalid FCUToHostEvent ${variant}`);
  }

  private readBytes(length: number): Uint8Array {
    if (this.offset + length > this.data.length) {
      throw new PostcardDecodeError('unexpected end of buffer');
    }
    const slice = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  private readVarintU32(): number {
    let result = 0;
    let shift = 0;
    while (this.offset < this.data.length) {
      const byte = this.data[this.offset++]!;
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) {
        return result >>> 0;
      }
      shift += 7;
      if (shift > 35) {
        throw new PostcardDecodeError('varint overflow');
      }
    }
    throw new PostcardDecodeError('unexpected end of varint');
  }
}

export class PostcardWriter {
  private readonly chunks: number[] = [];

  writeU8(value: number): void {
    this.writeVarintU32(value);
  }

  writeU16(value: number): void {
    this.writeVarintU32(value);
  }

  writeU32(value: number): void {
    this.writeVarintU32(value);
  }

  writeI32(value: number): void {
    const zz = (value << 1) ^ (value >> 31);
    this.writeVarintU32(zz >>> 0);
  }

  writeBool(value: boolean): void {
    this.writeU8(value ? 1 : 0);
  }

  writeString(value: string): void {
    const bytes = new TextEncoder().encode(value);
    this.writeVarintU32(bytes.length);
    for (const byte of bytes) {
      this.chunks.push(byte);
    }
  }

  /** Matches serde/postcard encoding of `uuid::Uuid` (length-prefixed 16 bytes). */
  writeUuidBytes(bytes: Uint8Array): void {
    if (bytes.length !== 16) {
      throw new Error('UUID must be 16 bytes');
    }
    this.writeVarintU32(16);
    for (const byte of bytes) {
      this.chunks.push(byte);
    }
  }

  writeOption<T>(value: T | null | undefined, writeSome: (item: T) => void): void {
    if (value === null || value === undefined) {
      this.writeU8(0);
      return;
    }
    this.writeU8(1);
    writeSome(value);
  }

  writeHashMapStringString(map: Record<string, string>): void {
    const entries = Object.entries(map);
    this.writeVarintU32(entries.length);
    for (const [key, value] of entries) {
      this.writeString(key);
      this.writeString(value);
    }
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }

  private writeVarintU32(value: number): void {
    let remaining = value >>> 0;
    while (remaining >= 0x80) {
      this.chunks.push((remaining & 0x7f) | 0x80);
      remaining >>>= 7;
    }
    this.chunks.push(remaining);
  }
}

export function uuidStringToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) {
    throw new Error('invalid UUID string');
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function uuidBytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** True when more notification chunks are needed to finish a postcard value. */
export function isPostcardIncomplete(error: unknown): boolean {
  return error instanceof PostcardDecodeError && error.message.includes('unexpected end');
}

export function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) {
    return Uint8Array.from(b);
  }
  if (b.length === 0) {
    return Uint8Array.from(a);
  }
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
