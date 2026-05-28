import assert from 'node:assert/strict';
import test from 'node:test';

const BleState = {
  Unknown: 'unknown',
  Resetting: 'resetting',
  Unsupported: 'unsupported',
  Unauthorized: 'unauthorized',
  On: 'on',
  Off: 'off',
};

function getBluetoothUnavailableMessage(state, platform) {
  if (state === BleState.Unsupported) {
    return 'Bluetooth is not supported on this device.';
  }
  if (state === BleState.Unauthorized) {
    return 'Bluetooth permission denied. Enable Bluetooth access for this app in Settings.';
  }
  if (state === BleState.Off) {
    if (platform === 'ios') {
      return 'Turn on Bluetooth in Control Center or Settings to connect to the FCU.';
    }
    return 'Turn on Bluetooth to connect to the FCU.';
  }
  if (state === BleState.Resetting) {
    return 'Bluetooth is restarting. Try again in a moment.';
  }
  if (state === BleState.Unknown) {
    return 'Bluetooth is unavailable. Try again in a moment.';
  }
  return null;
}

function getBluetoothActionLabel(state, platform) {
  if (state === BleState.Unauthorized) {
    return 'Open Settings';
  }
  if (state === BleState.Off) {
    return platform === 'android' ? 'Turn on Bluetooth' : 'Open Settings';
  }
  return 'Retry';
}

function isBluetoothBlocked(ready, state) {
  return ready && state !== BleState.On;
}

test('getBluetoothUnavailableMessage for off state is platform-specific', () => {
  assert.match(
    getBluetoothUnavailableMessage(BleState.Off, 'ios'),
    /Control Center/,
  );
  assert.doesNotMatch(
    getBluetoothUnavailableMessage(BleState.Off, 'android'),
    /Control Center/,
  );
});

test('getBluetoothActionLabel for off state', () => {
  assert.equal(getBluetoothActionLabel(BleState.Off, 'android'), 'Turn on Bluetooth');
  assert.equal(getBluetoothActionLabel(BleState.Off, 'ios'), 'Open Settings');
});

test('isBluetoothBlocked when ready and not on', () => {
  assert.equal(isBluetoothBlocked(true, BleState.Off), true);
  assert.equal(isBluetoothBlocked(true, BleState.On), false);
  assert.equal(isBluetoothBlocked(false, BleState.Off), false);
});
