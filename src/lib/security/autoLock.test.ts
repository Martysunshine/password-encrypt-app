import { vi } from "vitest";

import { AutoLockController } from "./autoLock";

describe("auto lock controller", () => {
  it("locks when timeout is reached", () => {
    vi.useFakeTimers();
    const onLock = vi.fn();
    const controller = new AutoLockController(onLock);

    controller.schedule(10_000);
    expect(controller.isScheduled()).toBe(true);

    vi.advanceTimersByTime(10_001);

    expect(onLock).toHaveBeenCalledTimes(1);
    expect(controller.isScheduled()).toBe(false);
    vi.useRealTimers();
  });

  it("resets timeout when scheduled again", () => {
    vi.useFakeTimers();
    const onLock = vi.fn();
    const controller = new AutoLockController(onLock);

    controller.schedule(10_000);
    vi.advanceTimersByTime(8_000);
    controller.schedule(10_000);
    vi.advanceTimersByTime(5_000);

    expect(onLock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5_001);
    expect(onLock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
