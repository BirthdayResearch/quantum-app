import { useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import UtilityButton from "@components/commons/UtilityButton";
import clsx from "clsx";
import { DFC_TO_API_RESET_TIME_LIMIT } from "../../constants";
import CircularProgress from "./CircularProgress";
import useResponsive from "../../hooks/useResponsive";

export default function AddressError({
  onClick,
  error,
  delayAction,
}: {
  onClick: () => void;
  error: string;
  delayAction: boolean;
}) {
  const { isMobile } = useResponsive();
  const [isDisabled, setIsDisabled] = useState(delayAction);

  return (
    <div
      className={clsx(
        "flex flex-row items-center justify-center",
        "md:flex-col md:mt-8",
      )}
    >
      <div
        className={clsx(
          "flex p-10 justify-center items-center border-[0.5px] border-error rounded",
          "md:border-transparent md:p-0",
        )}
      >
        <FiAlertCircle size={isMobile ? 32 : 48} className="text-dark-1000" />
      </div>
      <div
        className={clsx(
          "flex flex-col ml-4 justify-center items-center",
          "md:ml-0 md:items-center",
        )}
      >
        <span
          className={clsx(
            "text-left text-xs text-dark-900 mb-4",
            "md:text-center md:mt-6",
          )}
        >
          {error}
        </span>
        <div className="w-full md:w-auto md:px-0 md:mb-11">
          <UtilityButton
            disabled={isDisabled}
            label="Generate again"
            variant="secondary"
            onClick={onClick}
            disabledClass="!opacity-100 text-dark-1000/[0.3] !border-dark-1000/[0.3] dark-bg-card-section bg-opacity-30"
          >
            {isDisabled && delayAction && (
              <div className="inline-block ml-1 opacity-100">
                <CircularProgress
                  initialCounter={DFC_TO_API_RESET_TIME_LIMIT}
                  onTimeCounterEnd={() => {
                    setIsDisabled(false);
                  }}
                />
              </div>
            )}
          </UtilityButton>
        </div>
      </div>
    </div>
  );
}
