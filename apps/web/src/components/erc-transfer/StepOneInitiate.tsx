import clsx from "clsx";
import { useState } from "react";
import IconTooltip from "@components/commons/IconTooltip";
import ActionButton from "@components/commons/ActionButton";
import { useNetworkContext } from "@contexts/NetworkContext";
import { Network } from "types";
import { useAccount } from "wagmi";
import WalletAddressInput from "@components/WalletAddressInput";
import { TRANSACTION_ERROR_INFO } from "../../constants";

export default function StepOneInitiate({
  goToNextStep,
  refundAddress,
  setRefundAddress,
  isReadOnly,
}: {
  refundAddress: string;
  setRefundAddress: (value: string) => void;
  goToNextStep: () => void;
  isReadOnly: boolean;
}) {
  const { selectedNetworkA } = useNetworkContext();
  const { isConnected } = useAccount();

  const [hasAddressInputErr, setHasAddressInputErr] = useState<boolean>(false);

  return (
    <div className={clsx("flex flex-col mt-6", "md:flex-row md:gap-7 md:mt-4")}>
      <div className="flex flex-col justify-center grow px-8">
        <span className="font-semibold text-dark-900 tracking-[0.01em]">
          Getting started
        </span>
        <p className={clsx("text-sm text-dark-900 mt-1", "md:mt-2")}>
          Transactions on-chain are irreversible. Ensure your transaction
          details are correct and funds are sent in a single transaction, with a
          stable network connection.
        </p>
        <div className="pt-4">
          <div className={clsx("inline text-sm text-dark-900", "md:mt-2")}>
            Provide your DeFiChain wallet address below in the event that there
            is a need for a refund.
          </div>
          <button type="button" className={clsx("ml-1 align-middle")}>
            <IconTooltip
              title={TRANSACTION_ERROR_INFO.title}
              content={TRANSACTION_ERROR_INFO.content}
              customIconColor="text-dark-900"
            />
          </button>
        </div>
        <WalletAddressInput
          label=""
          blockchain={selectedNetworkA.name as Network}
          addressInput={refundAddress}
          onAddressInputChange={(addrInput) => setRefundAddress(addrInput)}
          onAddressInputError={(hasError) => setHasAddressInputErr(hasError)}
          disabled={!isConnected}
          readOnly={isReadOnly}
          isPrimary={false}
          customMessage={
            isReadOnly
              ? "Refund address is disabled for your transaction's security. If you need to edit it, cancel this transaction and create a new one."
              : undefined
          }
        />
        <div className="pt-5">
          <ActionButton
            label="Continue"
            variant="primary"
            disabled={hasAddressInputErr}
            onClick={goToNextStep}
          />
          <div className="text-dark-500 text-center text-xs pt-3">
            {hasAddressInputErr ? (
              <span>You must enter an address for refund to continue.</span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
