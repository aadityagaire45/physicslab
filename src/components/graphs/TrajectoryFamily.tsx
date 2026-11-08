import { memo, useMemo } from 'react';
import { sampleTrajectory } from '@/engine/physics/kinematics';
import { STANDARD_GRAVITY } from '@/engine/units/constants';

const ANGLES = [15, 30, 45, 60, 75] as const;
const SPEED = 20;
const WIDTH = 360;
const HEIGHT = 190;
const PAD = { left: 30, right: 12, top: 14, bottom: 24 };

/**
 * Family of ideal trajectories computed by the physics engine for a fixed
 * launch speed. Illustrates complementary angles sharing the same range and
 * 45° giving the maximum range on level ground.
 */
export const TrajectoryFamily = memo(function TrajectoryFamily() {
  const { paths, xMax, yMax } = useMemo(() => {
    const series = ANGLES.map((angleDeg) =>
      sampleTrajectory({ speed: SPEED, angleDeg, height: 0, gravity: STANDARD_GRAVITY }, 60),
    );
    const maxX = Math.max(...series.flat().map((p) => p.x));
    const maxY = Math.max(...series.flat().map((p) => p.y));
    const xm = Math.ceil(maxX / 10) * 10;
    const ym = Math.ceil(maxY / 5) * 5;
    const sx = (x: number) => PAD.left + (x / xm) * (WIDTH - PAD.left - PAD.right);
    const sy = (y: number) => HEIGHT - PAD.bottom - (y / ym) * (HEIGHT - PAD.top - PAD.bottom);
    return {
      xMax: xm,
      yMax: ym,
      paths: series.map((points, i) => ({
        angle: ANGLES[i],
        d: points.map((p, j) => `${j === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(''),
      })),
    };
  }, []);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const xTicks = Array.from({ length: xMax / 10 + 1 }, (_, i) => i * 10);
  const yTicks = Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5);

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Projectile trajectories for launch angles 15° to 75° at 20 m/s">
        {xTicks.map((t) => {
          const x = PAD.left + (t / xMax) * plotW;
          return (
            <g key={`x${t}`}>
              <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--grid)" />
              <text x={x} y={HEIGHT - 8} fontSize="9" textAnchor="middle" fill="var(--subtle)">
                {t}
              </text>
            </g>
          );
        })}
        {yTicks.map((t) => {
          const y = PAD.top + plotH - (yTicks.indexOf(t) * 5 / yMax) * plotH;
          return (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} stroke="var(--grid)" />
              <text x={PAD.left - 6} y={y + 3} fontSize="9" textAnchor="end" fill="var(--subtle)">
                {t}
              </text>
            </g>
          );
        })}
        <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--line-strong)" />
        {paths.map(({ angle, d }) => (
          <path
            key={angle}
            d={d}
            fill="none"
            stroke={angle === 45 ? 'var(--accent)' : 'var(--cyan)'}
            strokeOpacity={angle === 45 ? 1 : 0.55}
            strokeWidth={angle === 45 ? 2 : 1.4}
            strokeDasharray={angle === 45 ? undefined : '4 3'}
          />
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted">
        <span>
          v₀ = {SPEED} m/s · g = {STANDARD_GRAVITY} m/s² · θ = 15°–75°
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-accent" /> 45° (max range)
        </span>
        <span>Axes in metres</span>
      </figcaption>
    </figure>
  );
});
