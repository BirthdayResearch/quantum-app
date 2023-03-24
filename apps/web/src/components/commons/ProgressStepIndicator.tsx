import clsx from "clsx";
import { ProgressStepI } from "types";

export default function ProgressStepIndicator({
  steps,
  activeStep,
}: {
  steps: ProgressStepI[];
  activeStep: number;
}) {
  const getProgressWidth = () => {
    switch (activeStep) {
      case 1:
        return "after:w-[10%]";
      case 2:
        return "after:w-[35%]";
      case 3:
        return "after:w-[65%]";
      default:
        return "after:w-[100%]";
    }
  };

  return (
    <div
      className={clsx(
        "relative flex justify-between px-10",
        "before:absolute before:bg-dark-500 before:h-[1px] before:w-full before:top-1/2 before:-translate-y(1/2) before:left-0",
        "after:absolute after:bg-valid after:h-[1px] after:w-1/5 after:top-1/2 after:-translate-y(1/2) after:left-0 after:ease-in after:duration-300",
        getProgressWidth()
      )}
    >
      {steps.map(({ step, label }) => (
        <div key={step} className="relative z-[1]">
          {/* Step node */}
          <div
            className={clsx(
              "w-7 h-7 flex items-center justify-center rounded-full border-2 ease-in hover:border-dark-btn-hover",
              activeStep > step ? "bg-valid" : "bg-dark-100",
              activeStep >= step ? "border-valid" : "border-dark-500"
            )}
          >
            <span
              className={clsx(
                "font-bold tracking-wide",
                activeStep > step ? "text-dark-00" : "text-valid"
              )}
            >
              {activeStep >= step ? step : ""}
            </span>
          </div>

          {/* Step label */}
          <div className="absolute top-7 left-1/2 -translate-x-1/2">
            <span
              className={clsx(
                "text-xs",
                activeStep === step ? "text-dark-1000" : "text-dark-500"
              )}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
