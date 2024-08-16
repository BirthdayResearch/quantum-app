import useTimeCounter from "@hooks/useTimeCounter";
import { getDuration } from "@utils/durationHelper";
import clsx from "clsx";

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
    <div className={clsx("mt-3 text-left", "md:text-center")}>
      <span className="text-dark-900 text-2xs font-bold">
        {durationLeft ? `${durationLeft} LEFT` : ""}
      </span>
    </div>
  );
}
