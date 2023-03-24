import BigNumber from "bignumber.js";
import clsx from "clsx";

export default function ProgressBar({
  progressPercentage,
  fillColor,
}: {
  progressPercentage: number | BigNumber;
  fillColor: string;
}): JSX.Element {
  return (
    <div className="h-2 w-full bg-dark-200 rounded-md">
      <div
        style={{ width: `${progressPercentage}%` }}
        className={clsx("h-full rounded-md", fillColor)}
      />
    </div>
  );
}
