/**
 * Postcard Characteristics decode test. Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Inline postcard writer/reader matching codec.ts for golden vectors.

function writeVarintU32(value) {
  const chunks = [];
  let remaining = value >>> 0;
  while (remaining >= 0x80) {
    chunks.push((remaining & 0x7f) | 0x80);
    remaining >>>= 7;
  }
  chunks.push(remaining);
  return chunks;
}

function writeString(value) {
  const bytes = new TextEncoder().encode(value);
  return [...writeVarintU32(bytes.length), ...bytes];
}

function encodeCharacteristics(chars) {
  const chunks = [
    ...writeVarintU32(chars.num_fire_positions),
    ...writeString(chars.name),
    ...(chars.kind.tag === 'HPA'
      ? [0, chars.kind.num_solenoids]
      : [1]),
    ...writeString(chars.compatibility_id),
  ];
  return Uint8Array.from(chunks);
}

// Minimal reader matching PostcardReader.readCharacteristics field order.
class PostcardReader {
  constructor(data) {
    this.data = data;
    this.offset = 0;
  }

  readVarintU32() {
    let result = 0;
    let shift = 0;
    while (this.offset < this.data.length) {
      const byte = this.data[this.offset++];
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) {
        return result >>> 0;
      }
      shift += 7;
    }
    throw new Error('unexpected end of varint');
  }

  readString() {
    const length = this.readVarintU32();
    const slice = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return new TextDecoder().decode(slice);
  }

  readFcuKind() {
    const variant = this.readVarintU32();
    if (variant === 0) {
      return { tag: 'HPA', num_solenoids: this.readVarintU32() };
    }
    if (variant === 1) {
      return { tag: 'AEG' };
    }
    throw new Error(`invalid FCUKind ${variant}`);
  }

  readCharacteristics() {
    const num_fire_positions = this.readVarintU32();
    const name = this.readString();
    const kind = this.readFcuKind();
    const compatibility_id = this.readString();
    return { num_fire_positions, name, kind, compatibility_id };
  }
}

describe('Characteristics postcard codec', () => {
  it('round-trips HPA characteristics with compatibility_id', () => {
    const expected = {
      num_fire_positions: 4,
      name: 'Shoebill SOE ESP32',
      kind: { tag: 'HPA', num_solenoids: 1 },
      compatibility_id: 'catnip.shoebill-soe-hpa',
    };
    const payload = encodeCharacteristics(expected);
    const decoded = new PostcardReader(payload).readCharacteristics();
    assert.deepEqual(decoded, expected);
  });

  it('round-trips AEG characteristics with compatibility_id', () => {
    const expected = {
      num_fire_positions: 2,
      name: 'Test AEG',
      kind: { tag: 'AEG' },
      compatibility_id: 'vendor.example.aeg-v1',
    };
    const payload = encodeCharacteristics(expected);
    const decoded = new PostcardReader(payload).readCharacteristics();
    assert.deepEqual(decoded, expected);
  });
});
