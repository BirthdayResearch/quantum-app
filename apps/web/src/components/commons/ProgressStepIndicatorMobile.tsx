import clsx from "clsx";
import { ProgressStepI } from "types";

export default function ProgressStepIndicatorMobile({
  steps,
  activeStep,
}: {
  steps: ProgressStepI[];
  activeStep: number;
}) {
  return (
    <div className="flex gap-2">
      {steps.map(({ step, label }) => (
        <div key={step} className="w-1/3 flex flex-col gap-1">
          <div
            className={clsx(
              "h-0.5 rounded-[2px]",
              activeStep >= step ? "bg-valid" : "bg-dark-300",
            )}
          />
          <span
            className={clsx(
              "text-xs font-semibold text-left",
              activeStep >= step ? "text-valid" : "text-dark-700",
            )}
          >{`${step}. ${label}`}</span>
        </div>
      ))}
    </div>
  );
}
