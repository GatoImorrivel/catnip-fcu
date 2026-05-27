import type { FCUToHostEvent } from '@/messages/types';

import { CatnipBleClient } from './catnip-ble-client';
import { BleManager, ensureBleManagerStarted } from './ble-manager';

export type FcuSessionStatus = 'idle' | 'connecting' | 'ready' | 'error';

type FcuSession = {
  peripheralId: string;
  refCount: number;
  status: FcuSessionStatus;
  client: CatnipBleClient | null;
  error: string | null;
  connectPromise: Promise<void> | null;
  listeners: Set<() => void>;
  eventListeners: Set<(event: FCUToHostEvent) => void>;
  generation: number;
};

const sessions = new Map<string, FcuSession>();

function getOrCreateSession(peripheralId: string): FcuSession {
  let session = sessions.get(peripheralId);
  if (!session) {
    session = {
      peripheralId,
      refCount: 0,
      status: 'idle',
      client: null,
      error: null,
      connectPromise: null,
      listeners: new Set(),
      eventListeners: new Set(),
      generation: 0,
    };
    sessions.set(peripheralId, session);
  }
  return session;
}

function emit(session: FcuSession): void {
  for (const listener of session.listeners) {
    listener();
  }
}

function dispatchEvent(session: FcuSession, event: FCUToHostEvent): void {
  for (const listener of session.eventListeners) {
    listener(event);
  }
}

async function openConnection(session: FcuSession, generation: number): Promise<void> {
  const { peripheralId } = session;
  session.status = 'connecting';
  session.error = null;
  emit(session);

  try {
    await ensureBleManagerStarted();
    await BleManager.connect(peripheralId);
    if (generation !== session.generation) {
      return;
    }

    const client = await CatnipBleClient.connect(peripheralId);
    if (generation !== session.generation) {
      await client.close();
      if (session.refCount === 0) {
        await BleManager.disconnect(peripheralId).catch(() => undefined);
      }
      return;
    }

    client.onEvent = (event) => dispatchEvent(session, event);

    session.client = client;
    session.status = 'ready';
    session.error = null;
  } catch (err: unknown) {
    if (generation !== session.generation) {
      return;
    }
    session.status = 'error';
    session.client = null;
    session.error = err instanceof Error ? err.message : String(err);
  } finally {
    if (generation === session.generation) {
      session.connectPromise = null;
      emit(session);
    }
  }
}

type CloseConnectionOptions = {
  /** Always disconnect at the native layer (e.g. manual Retry). */
  forceDisconnect?: boolean;
};

async function closeConnection(
  session: FcuSession,
  options: CloseConnectionOptions = {},
): Promise<void> {
  session.generation += 1;
  const client = session.client;
  session.client = null;
  session.status = 'idle';
  session.error = null;
  session.connectPromise = null;
  emit(session);

  if (client) {
    await client.close();
  }

  // A screen may re-acquire while teardown is still closing the previous session
  // (e.g. mapping → verify). Do not drop the native link for the new consumer.
  if (options.forceDisconnect || session.refCount === 0) {
    await BleManager.disconnect(session.peripheralId).catch(() => undefined);
  }
}

function ensureConnected(session: FcuSession): void {
  if (session.status === 'ready' && session.client) {
    return;
  }
  if (session.connectPromise) {
    return;
  }

  const generation = session.generation;
  session.connectPromise = openConnection(session, generation);
}

async function teardownSession(session: FcuSession): Promise<void> {
  if (sessions.get(session.peripheralId) !== session) {
    return;
  }

  if (session.refCount > 0) {
    return;
  }

  await closeConnection(session);

  if (session.refCount > 0) {
    ensureConnected(session);
    await session.connectPromise?.catch(() => undefined);
    return;
  }

  sessions.delete(session.peripheralId);
}

export function acquireFcuSession(peripheralId: string): void {
  const session = getOrCreateSession(peripheralId);
  session.refCount += 1;
  ensureConnected(session);
}

export function releaseFcuSession(peripheralId: string): void {
  const session = sessions.get(peripheralId);
  if (!session) {
    return;
  }

  session.refCount = Math.max(0, session.refCount - 1);
  if (session.refCount > 0) {
    return;
  }

  void teardownSession(session);
}

export function subscribeFcuSession(peripheralId: string, listener: () => void): () => void {
  const session = getOrCreateSession(peripheralId);
  session.listeners.add(listener);
  return () => {
    session.listeners.delete(listener);
  };
}

export function subscribeFcuSessionEvents(
  peripheralId: string,
  listener: (event: FCUToHostEvent) => void,
): () => void {
  const session = getOrCreateSession(peripheralId);
  session.eventListeners.add(listener);
  return () => {
    session.eventListeners.delete(listener);
  };
}

export function waitForFcuSessionReady(
  peripheralId: string,
  timeoutMs = 30_000,
): Promise<CatnipBleClient> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      clearTimeout(timer);
      action();
    };

    const check = () => {
      const snap = getFcuSessionSnapshot(peripheralId);
      const readyClient = snap.ready ? snap.client : null;
      if (readyClient) {
        finish(() => resolve(readyClient));
        return;
      }
      if (snap.status === 'error') {
        finish(() => reject(new Error(snap.error ?? 'FCU connection failed')));
      }
    };

    check();
    const unsubscribe = subscribeFcuSession(peripheralId, check);
    const timer = setTimeout(() => {
      finish(() => reject(new Error('FCU connection timed out')));
    }, timeoutMs);
  });
}

export function getFcuSessionSnapshot(peripheralId: string): {
  status: FcuSessionStatus;
  client: CatnipBleClient | null;
  error: string | null;
  ready: boolean;
} {
  const session = sessions.get(peripheralId);
  if (!session) {
    return {
      status: 'idle',
      client: null,
      error: null,
      ready: false,
    };
  }

  return {
    status: session.status,
    client: session.client,
    error: session.error,
    ready: session.status === 'ready' && session.client !== null,
  };
}

export function reconnectFcuSession(peripheralId: string): void {
  const session = sessions.get(peripheralId);
  if (!session || session.refCount === 0) {
    return;
  }

  void (async () => {
    await closeConnection(session, { forceDisconnect: true });
    if (session.refCount === 0) {
      return;
    }
    ensureConnected(session);
    await session.connectPromise?.catch(() => undefined);
  })();
}

export function clearFcuSessionsForTests(): void {
  sessions.clear();
}
