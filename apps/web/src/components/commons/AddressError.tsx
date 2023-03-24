import { useState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import UtilityButton from "@components/commons/UtilityButton";
import { DFC_TO_API_RESET_TIME_LIMIT } from "../../constants";
import CircularProgress from "./CircularProgress";

export default function AddressError({
  onClick,
  error,
  delayAction,
}: {
  onClick: () => void;
  error: string;
  delayAction: boolean;
}) {
  const [isDisabled, setIsDisabled] = useState(delayAction);

  return (
    <div className="flex flex-col items-center justify-center mt-8">
      <FiAlertCircle size={48} className="text-dark-1000" />
      <span className="text-center text-xs text-dark-900 mt-6 mb-4">
        {error}
      </span>
      <div className="w-full md:w-auto md:px-0 mb-11">
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
  );
}
