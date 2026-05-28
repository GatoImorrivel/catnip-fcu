/**
 * Selector mapping validation tests. Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function hasDuplicateFcuPositions(mapping) {
  const seen = new Set();
  for (const entry of mapping) {
    if (seen.has(entry.fcuPosition)) {
      return true;
    }
    seen.add(entry.fcuPosition);
  }
  return false;
}

function hasDuplicateUiSlotIds(mapping) {
  const seen = new Set();
  for (const entry of mapping) {
    if (seen.has(entry.uiSlotId)) {
      return true;
    }
    seen.add(entry.uiSlotId);
  }
  return false;
}

function isValidFcuPosition(fcuPosition, fcuNumPositions) {
  return (
    Number.isInteger(fcuPosition) &&
    fcuPosition >= 0 &&
    fcuPosition < fcuNumPositions
  );
}

function isMappingComplete(mapping, fcuNumPositions, validSlotIds) {
  if (hasDuplicateFcuPositions(mapping) || hasDuplicateUiSlotIds(mapping)) {
    return false;
  }
  return mapping.every(
    (entry) =>
      validSlotIds.has(entry.uiSlotId) &&
      isValidFcuPosition(entry.fcuPosition, fcuNumPositions),
  );
}

describe('selector mapping validation', () => {
  it('rejects fcuPosition >= num positions', () => {
    const mapping = [{ uiSlotId: 'safe', fcuPosition: 4 }];
    assert.equal(isMappingComplete(mapping, 4, new Set(['safe'])), false);
  });

  it('accepts in-range positions', () => {
    const mapping = [
      { uiSlotId: 'safe', fcuPosition: 0 },
      { uiSlotId: 'semi', fcuPosition: 1 },
    ];
    assert.equal(isMappingComplete(mapping, 3, new Set(['safe', 'semi'])), true);
  });

  it('rejects unknown slot ids', () => {
    const mapping = [{ uiSlotId: 'bogus', fcuPosition: 0 }];
    assert.equal(isMappingComplete(mapping, 3, new Set(['safe'])), false);
  });

  it('rejects duplicate ui slots', () => {
    const mapping = [
      { uiSlotId: 'safe', fcuPosition: 0 },
      { uiSlotId: 'safe', fcuPosition: 1 },
    ];
    assert.equal(isMappingComplete(mapping, 3, new Set(['safe'])), false);
  });
});
