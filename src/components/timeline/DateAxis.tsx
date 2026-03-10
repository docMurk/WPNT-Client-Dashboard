import { useMemo } from 'react';
import dayjs from 'dayjs';

interface DateAxisProps {
  visibleTimeStart: number;
  visibleTimeEnd: number;
  containerWidth: number;
}

interface Tick {
  x: number;
  label: string;
  isMinor: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function generateTicks(
  visibleTimeStart: number,
  visibleTimeEnd: number,
  containerWidth: number,
): Tick[] {
  const span = visibleTimeEnd - visibleTimeStart;
  const spanDays = span / DAY_MS;
  const ticks: Tick[] = [];

  const toX = (time: number) =>
    ((time - visibleTimeStart) / span) * containerWidth;

  if (spanDays <= 20) {
    // Daily ticks WITH labels ("May 3", "May 4", ...)
    let d = dayjs(visibleTimeStart).startOf('day');
    const end = dayjs(visibleTimeEnd).add(1, 'day');
    while (d.isBefore(end)) {
      const x = toX(d.valueOf());
      if (x >= -50 && x <= containerWidth + 50) {
        ticks.push({ x, label: d.format('MMM D'), isMinor: false });
      }
      d = d.add(1, 'day');
    }
  } else if (spanDays <= 40) {
    // Daily hashmarks (minor, no label) + weekly labels (major)
    let d = dayjs(visibleTimeStart).startOf('day');
    const end = dayjs(visibleTimeEnd).add(1, 'day');
    while (d.isBefore(end)) {
      const x = toX(d.valueOf());
      if (x >= -50 && x <= containerWidth + 50) {
        // Monday = major with label, other days = minor hashmark
        const isMonday = d.day() === 1;
        ticks.push({
          x,
          label: isMonday ? d.format('MMM D') : '',
          isMinor: !isMonday,
        });
      }
      d = d.add(1, 'day');
    }
  } else if (spanDays < 90) {
    // Weekly ticks (Mondays)
    let d = dayjs(visibleTimeStart).startOf('week').add(1, 'day');
    const end = dayjs(visibleTimeEnd).add(1, 'week');
    while (d.isBefore(end)) {
      const x = toX(d.valueOf());
      if (x >= -50 && x <= containerWidth + 50) {
        ticks.push({ x, label: d.format('MMM D'), isMinor: false });
      }
      d = d.add(1, 'week');
    }
  } else if (spanDays < 365) {
    // Monthly ticks with mid-month minor tick
    let d = dayjs(visibleTimeStart).startOf('month');
    const end = dayjs(visibleTimeEnd).add(1, 'month');
    while (d.isBefore(end)) {
      const x = toX(d.valueOf());
      if (x >= -50 && x <= containerWidth + 50) {
        const label =
          d.month() === 0 ? d.format("MMM 'YY") : d.format('MMM');
        ticks.push({ x, label, isMinor: false });
      }
      // Mid-month minor tick on the 15th
      const mid = d.date(15);
      const midX = toX(mid.valueOf());
      if (midX >= -50 && midX <= containerWidth + 50) {
        ticks.push({ x: midX, label: '', isMinor: true });
      }
      d = d.add(1, 'month');
    }
  } else {
    // Quarterly ticks
    const startD = dayjs(visibleTimeStart);
    const quarterMonth = Math.floor(startD.month() / 3) * 3;
    let d = startD.month(quarterMonth).startOf('month');
    const end = dayjs(visibleTimeEnd).add(3, 'month');
    while (d.isBefore(end)) {
      const x = toX(d.valueOf());
      if (x >= -50 && x <= containerWidth + 50) {
        const q = Math.floor(d.month() / 3) + 1;
        ticks.push({ x, label: `Q${q} '${d.format('YY')}`, isMinor: false });
      }
      d = d.add(3, 'month');
    }
  }

  return ticks;
}

export function DateAxis({
  visibleTimeStart,
  visibleTimeEnd,
  containerWidth,
}: DateAxisProps) {
  const ticks = useMemo(
    () => generateTicks(visibleTimeStart, visibleTimeEnd, containerWidth),
    [visibleTimeStart, visibleTimeEnd, containerWidth],
  );

  const span = visibleTimeEnd - visibleTimeStart;
  const todayX =
    ((Date.now() - visibleTimeStart) / span) * containerWidth;
  const showToday = todayX > -10 && todayX < containerWidth + 10;

  return (
    <div className="relative w-full" style={{ height: 40 }}>
      {/* Main axis line */}
      <div
        className="absolute left-0 right-0 bg-wpnt-blue"
        style={{ top: 0, height: 2 }}
      />

      {/* Tick marks + labels */}
      {ticks.map((tick, i) => (
        <div key={i} className="absolute" style={{ left: tick.x }}>
          {/* Tick mark */}
          <div
            className="absolute bg-wpnt-blue"
            style={{
              top: 0,
              left: 0,
              width: 1,
              height: tick.isMinor ? 6 : 12,
              opacity: tick.isMinor ? 0.4 : 1,
            }}
          />
          {/* Label (only for major ticks) */}
          {!tick.isMinor && tick.label && (
            <span
              className="absolute whitespace-nowrap text-[15px] text-wpnt-text"
              style={{
                top: 16,
                left: 0,
                transform: 'translateX(-50%)',
              }}
            >
              {tick.label}
            </span>
          )}
        </div>
      ))}

      {/* Today marker */}
      {showToday && (
        <div
          className="absolute"
          style={{
            left: todayX,
            top: -999,
            bottom: -999,
            zIndex: 1,
          }}
        >
          <div
            className="absolute"
            style={{
              left: -1,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'var(--color-status-declined)',
              opacity: 0.7,
              borderLeft: '1px dashed var(--color-status-declined)',
            }}
          />
          <span
            className="absolute rounded bg-status-declined px-1.5 py-0.5 text-[9px] font-semibold text-white whitespace-nowrap"
            style={{
              top: 2,
              left: 4,
            }}
          >
            Today
          </span>
        </div>
      )}
    </div>
  );
}
