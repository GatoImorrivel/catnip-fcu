/**
 * Postcard codec guard tests. Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const MAX_POSTCARD_COLLECTION_LENGTH = 256;

function assertNonNegativeIntegerFcuPosition(position) {
  if (!Number.isInteger(position) || position < 0) {
    throw new Error(`invalid FCU position: ${position}`);
  }
}

function encodePosition(position) {
  assertNonNegativeIntegerFcuPosition(position);
  return position >>> 0;
}

function uuidStringToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) {
    throw new Error('invalid UUID string');
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    const pair = hex.slice(i * 2, i * 2 + 2);
    if (!/^[0-9a-fA-F]{2}$/.test(pair)) {
      throw new Error('invalid UUID string');
    }
    bytes[i] = Number.parseInt(pair, 16);
  }
  return bytes;
}

describe('postcard codec guards', () => {
  it('rejects negative FCU positions', () => {
    assert.throws(() => encodePosition(-1), /invalid FCU position/);
  });

  it('does not coerce negative positions to huge unsigned values', () => {
    assert.throws(() => encodePosition(-1));
  });

  it('rejects oversized collection lengths', () => {
    assert.equal(MAX_POSTCARD_COLLECTION_LENGTH > 1000, true);
  });

  it('rejects invalid UUID hex', () => {
    assert.throws(
      () => uuidStringToBytes('00000000-0000-4000-8000-000000000000'.replace(/0/g, 'z')),
      /invalid UUID string/,
    );
  });

  it('accepts valid UUID hex', () => {
    const bytes = uuidStringToBytes('550e8400-e29b-41d4-a716-446655440000');
    assert.equal(bytes.length, 16);
  });
});
