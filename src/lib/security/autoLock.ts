export class AutoLockController {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  public constructor(private readonly onLock: () => void) {}

  public schedule(timeoutMs: number): void {
    this.clear();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.onLock();
    }, timeoutMs);
  }

  public clear(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  public isScheduled(): boolean {
    return this.timeoutId !== null;
  }
}
