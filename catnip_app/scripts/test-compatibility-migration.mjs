/**
 * Compatibility id migration tests. Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function getDefaultProfileId(compatibilityId, firemodeName) {
  return `default:${compatibilityId}:${firemodeName}`;
}

function remapDefaultProfileId(profileId, oldCompatibilityId, newCompatibilityId) {
  const prefix = `default:${oldCompatibilityId}:`;
  if (!profileId.startsWith(prefix)) {
    return profileId;
  }
  const firemodeName = profileId.slice(prefix.length);
  return getDefaultProfileId(newCompatibilityId, firemodeName);
}

describe('compatibility id migration', () => {
  it('remaps default profile ids', () => {
    const oldId = 'family-a';
    const newId = 'family-b';
    const profileId = getDefaultProfileId(oldId, 'semi');
    assert.equal(remapDefaultProfileId(profileId, oldId, newId), getDefaultProfileId(newId, 'semi'));
  });

  it('leaves custom profile ids unchanged', () => {
    const customId = 'custom-uuid-123';
    assert.equal(remapDefaultProfileId(customId, 'a', 'b'), customId);
  });
});
