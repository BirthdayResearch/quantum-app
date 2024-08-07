import clsx from "clsx";
import { FormOptions } from "@contexts/NetworkContext";
import ConfirmationProgress from "./TransactionConfirmationProgressBar";
import { DFC_CONFIRMATIONS_BLOCK_TOTAL } from "../constants";
import useResponsive from "../hooks/useResponsive";

export default function DfcTransactionStatus({
  isConfirmed,
  isApiSuccess,
  numOfConfirmations,
}: {
  isConfirmed: boolean;
  isApiSuccess: boolean;
  numOfConfirmations: string;
}) {
  const { isLg, isMd, isMobile } = useResponsive();

  const title = isConfirmed
    ? "Transaction validated"
    : "Validating your transaction";
  const description = isConfirmed
    ? "Please wait as we redirect you to the next step."
    : "Please wait as your transaction is being validated. Upon validation, you will be redirected to the next step for the claiming of your tokens.";

  return (
    <div
      className={clsx("flex w-full items-center", {
        "flex-col": isMobile || (!isConfirmed && !isLg),
        "flex-row": isLg || (isConfirmed && isMd),
      })}
    >
      <div
        className={clsx("lg:w-min", {
          "w-full order-first lg:order-last": !isConfirmed,
          "order-last": isConfirmed,
          "pt-6": isConfirmed && isMobile,
        })}
      >
        <ConfirmationProgress
          confirmationBlocksTotal={DFC_CONFIRMATIONS_BLOCK_TOTAL}
          confirmationBlocksCurrent={numOfConfirmations}
          isConfirmed={isConfirmed}
          isApiSuccess={isApiSuccess}
          txnType="DeFiChain"
          showCircular={isConfirmed}
          activeTab={FormOptions.INSTANT}
        />
      </div>
      <div
        className={clsx("flex-col flex-1", {
          "pr-8": isLg || (isConfirmed && isMd),
        })}
      >
        <div
          className={clsx(
            "leading-5 font-semibold text-dark-900 text-base pt-6 text-left",
            "md:text-lg md:leading-6 lg:pt-0",
            {
              "pt-0": isConfirmed && isMd,
              "text-center": isMobile && isConfirmed,
            },
          )}
        >
          {title}
        </div>
        <div
          className={clsx("pt-2 text-sm text-dark-700 text-left", {
            "text-center": isMobile && isConfirmed,
          })}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
