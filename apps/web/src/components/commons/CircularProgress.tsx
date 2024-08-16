import useTimeCounter from "@hooks/useTimeCounter";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function CircularProgress({
  initialCounter,
  onTimeCounterEnd,
}: {
  initialCounter: number;
  onTimeCounterEnd: () => void;
}) {
  const { timeLimitPercentage } = useTimeCounter(
    initialCounter,
    onTimeCounterEnd,
  );

  return (
    <div className="w-3 h-3">
      <svg style={{ height: 0, width: 0 }}>
        <defs>
          <linearGradient id="circularProgress" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#FF00FF" />
            <stop offset="100.4%" stopColor="#EC0C8D" />
          </linearGradient>
        </defs>
      </svg>
      <CircularProgressbar
        value={timeLimitPercentage}
        strokeWidth={20}
        counterClockwise
        styles={{
          path: { stroke: 'url("#circularProgress")' },
          trail: { stroke: "#2B2B2B" },
        }}
      />
    </div>
  );
}

export default CircularProgress;
