import { useState, useEffect } from "react";
import ActionButton from "@components/commons/ActionButton";
import Modal from "@components/commons/Modal";
import { useContractContext } from "@contexts/ContractContext";
import { SuccessCopy } from "@components/QrAddress";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import SearchTransactionIcon from "@components/icons/SearchTransactionIcon";

export interface ModalConfigType {
  isOpen: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  onClose: () => void;
  transactionHash: string;
  destinationAddress?: string;
  amount?: string;
  symbol?: string;
}

export default function QueueTransactionModal({
  isOpen,
  title,
  message,
  buttonLabel,
  onClose,
  transactionHash,
  destinationAddress,
  amount,
  symbol,
}: ModalConfigType) {
  const { ExplorerURL } = useContractContext();

  const [showSuccessCopy, setShowSuccessCopy] = useState(false);
  const { copy } = useCopyToClipboard();

  const handleOnCopy = (text) => {
    copy(text);
    setShowSuccessCopy(true);
  };

  useEffect(() => {
    if (showSuccessCopy) {
      setTimeout(() => setShowSuccessCopy(false), 2000);
    }
  }, [showSuccessCopy]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      customStyle="grid grid-rows-max-content-1fr"
    >
      <SuccessCopy
        containerClass="m-auto right-0 left-0 top-2"
        show={showSuccessCopy}
      />
      <div className="flex flex-col w-full justify-between">
        <div>
          <div className="flex flex-col mb-6 md:mb-5 w-full md:px-6 md:items-center pb-[32px] md:pb-9 border-b border-dark-300 border-opacity-50">
            <SearchTransactionIcon />
            <div className="font-bold text-xl lg:text-2xl text-dark-900 mt-4">
              {title}
            </div>
            <div className="text-sm lg:text-base lg:leading-5 text-dark-700 mt-1 md:text-center md:w-11/12">
              {message}
            </div>
          </div>
          <div className="w-full">
            <div className="text-dark-900 font-semibold text-xl tracking-[0.01em] mb-8 md:mb-6">
              Transaction details
            </div>
            <div className="flex flex-row justify-between mb-10 md:mb-8">
              <div className="text-dark-700 text-sm lg:text-base leading-5">
                Amount to receive
              </div>
              <div className="text-dark-1000 text-right">
                {amount} {symbol}
              </div>
            </div>
            <div className="flex flex-row justify-between mb-10 md:mb-8">
              <div className="text-dark-700 text-sm lg:text-base leading-5">
                Destination address
              </div>
              <div className="text-dark-1000 w-6/12 break-words text-right">
                {destinationAddress}
              </div>
            </div>
            <div className="flex flex-row justify-between">
              <div className="text-dark-700 text-sm lg:text-base leading-5">
                Transaction hash
              </div>
              <div className="text-dark-1000 text-right w-7/12 break-all">
                {transactionHash}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-2 md:pt-[40px]">
          <ActionButton
            isExternalArrowIcon
            label={buttonLabel}
            customStyle="bg-dark-1000 text-sm lg:text-base lg:px-[72px] max-w-[418px] min-h-[44px] max-h-[56px]"
            customIconStyle="ml-2"
            onClick={() => window.open(`${ExplorerURL}/tx/${transactionHash}`)}
          />
          <ActionButton
            variant="secondary"
            label="Copy transaction hash"
            customStyle="text-sm lg:text-base lg:px-[72px] max-w-[418px] pb-3.5 mt-2"
            onClick={() => handleOnCopy(transactionHash)}
          />
        </div>
      </div>
    </Modal>
  );
}
