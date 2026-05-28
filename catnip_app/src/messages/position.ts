export function assertNonNegativeIntegerFcuPosition(position: number): void {
  if (!Number.isInteger(position) || position < 0) {
    throw new Error(`invalid FCU position: ${position}`);
  }
}
