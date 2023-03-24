import useTimeCounter from "@hooks/useTimeCounter";
import { getDuration } from "@utils/durationHelper";

export default function TimeLimitCounter({
  time,
  onTimeElapsed,
}: {
  time: number;
  onTimeElapsed: () => void;
}) {
  const { timeRemaining } = useTimeCounter(time, onTimeElapsed);
  const durationLeft = getDuration(timeRemaining.dividedBy(1000).toNumber());
  return (
    <div className="mt-3 text-center">
      <span className="text-dark-gradient-3 text-2xs font-bold">
        {durationLeft ? `${durationLeft} LEFT` : ""}
      </span>
    </div>
  );
}
