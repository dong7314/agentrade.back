// 다음 전략 실행 시점을 계산하는 로직
export const calculateNextRunAt = (
  scheduleAnchorAt: Date,
  intervalMinutes: number,
): Date => {
  const now = new Date();

  if (scheduleAnchorAt > now) {
    return scheduleAnchorAt;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  const elapsedMs = now.getTime() - scheduleAnchorAt.getTime();
  const elapsedIntervals = Math.floor(elapsedMs / intervalMs);

  return new Date(
    scheduleAnchorAt.getTime() + (elapsedIntervals + 1) * intervalMs,
  );
};
