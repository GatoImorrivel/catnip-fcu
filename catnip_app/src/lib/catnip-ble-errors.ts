export class CatnipBleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatnipBleError';
  }
}

export class CatnipBleTimeoutError extends CatnipBleError {
  constructor(message = 'FCU did not respond within 3 seconds') {
    super(message);
    this.name = 'CatnipBleTimeoutError';
  }
}

export class CatnipBleNotReadyError extends CatnipBleError {
  constructor(message = 'Catnip BLE client is not connected') {
    super(message);
    this.name = 'CatnipBleNotReadyError';
  }
}
