import * as React from "react";
import { useState, useEffect } from "react";
import Modal from "@components/commons/Modal";
import dayjs from "dayjs";
import { ModalTypeToDisplay, Network } from "types";
import ActionButton from "@components/commons/ActionButton";
import truncateTextFromMiddle from "@utils/textHelper";
import SearchTransactionIcon from "@components/icons/SearchTransactionIcon";
import clsx from "clsx";
import { IoMdCheckmarkCircle } from "react-icons/io";
import { useDeFiScanContext } from "@contexts/DeFiScanContext";
import { useContractContext } from "@contexts/ContractContext";
import { QueueTxData } from "@components/erc-transfer/QueryTransactionModal";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { SuccessCopy } from "@components/QrAddress";
import mapTokenToNetworkName from "@utils/mapTokenToNetworkName";
import GoToAnotherTransaction from "./GoToAnotherTransaction";

interface TransactionCompletionModalProps {
  type?: ModalTypeToDisplay;
  onClose: () => void;
  isOpen: boolean;
  onBack: () => void;
  adminQueueSendTxHash?: string;
  queueModalDetails?: QueueTxData;
}

const titles = {
  [ModalTypeToDisplay.Refunded]: "Refund successful",
  [ModalTypeToDisplay.Completed]: "Transaction completed",
  [ModalTypeToDisplay.RefundRequested]: "Refund request submitted",
};

const descriptions = {
  [ModalTypeToDisplay.Refunded]:
    "Please check your MetaMask wallet for your refunded tokens.",
  [ModalTypeToDisplay.Completed]:
    "Please check your DeFiChain address for your received dTokens.",
  [ModalTypeToDisplay.RefundRequested]:
    "Track your transaction via the status icon (top-right corner) using the same transaction hash.",
};

const firstRowTitles = {
  [ModalTypeToDisplay.Refunded]: "Amount refunded",
  [ModalTypeToDisplay.Completed]: "Date initiated",
  [ModalTypeToDisplay.RefundRequested]: "Amount to refund",
};

const secondRowTitles = {
  [ModalTypeToDisplay.Refunded]: "Refund TX hash",
  [ModalTypeToDisplay.Completed]: "Amount to receive",
  [ModalTypeToDisplay.RefundRequested]: "Destination address",
};
const thirdRowTitles = {
  [ModalTypeToDisplay.Refunded]: "Timestamp",
  [ModalTypeToDisplay.Completed]: "Destination address",
};

const buttonLabels = {
  [ModalTypeToDisplay.Refunded]: "View on DeFiScan",
  [ModalTypeToDisplay.Completed]: "View on DeFiScan",
  [ModalTypeToDisplay.RefundRequested]: "View on Etherscan",
};

export default function TransactionCompletionModal({
  type,
  onClose,
  isOpen,
  onBack,
  adminQueueSendTxHash,
  queueModalDetails,
}: TransactionCompletionModalProps): JSX.Element {
  const { copy } = useCopyToClipboard();
  const { getTransactionUrl } = useDeFiScanContext();
  const { ExplorerURL } = useContractContext();
  const [showSuccessCopy, setShowSuccessCopy] = useState(false);

  const { amount, token, transactionHash, initiatedDate, destinationAddress } =
    queueModalDetails ?? {};

  const dfcSymbolToDisplay = mapTokenToNetworkName(Network.DeFiChain, token);
  const ethSymbolToDisplay = mapTokenToNetworkName(Network.Ethereum, token);

  const handleOnCopy = (text) => {
    copy(text);
    setShowSuccessCopy(true);
  };

  useEffect(() => {
    if (showSuccessCopy) {
      setTimeout(() => setShowSuccessCopy(false), 2000);
    }
  }, [showSuccessCopy]);

  const firstRowResult = {
    [ModalTypeToDisplay.Refunded]: `${amount} ${ethSymbolToDisplay}`,
    [ModalTypeToDisplay.Completed]: dayjs(initiatedDate).format(
      "DD/MM/YYYY, HH:mm A",
    ),
    [ModalTypeToDisplay.RefundRequested]: `${amount} ${dfcSymbolToDisplay}`,
  };
  const secondRowResult = {
    [ModalTypeToDisplay.Refunded]: adminQueueSendTxHash,
    [ModalTypeToDisplay.Completed]: `${amount} ${dfcSymbolToDisplay}`,
    [ModalTypeToDisplay.RefundRequested]: destinationAddress,
  };
  const thirdRowResult = {
    [ModalTypeToDisplay.Refunded]: dayjs(initiatedDate).format(
      "DD/MM/YYYY, HH:mm A",
    ),
    [ModalTypeToDisplay.Completed]: destinationAddress,
  };
  const externalLinkButtonUrls = {
    [ModalTypeToDisplay.Refunded]: adminQueueSendTxHash
      ? getTransactionUrl(adminQueueSendTxHash)
      : undefined,
    [ModalTypeToDisplay.Completed]: adminQueueSendTxHash
      ? getTransactionUrl(adminQueueSendTxHash)
      : undefined,
    [ModalTypeToDisplay.RefundRequested]: `${ExplorerURL}/tx/${transactionHash}`,
  };

  if (type === undefined) {
    // eslint-disable-next-line
    return <></>;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <SuccessCopy
        containerClass="m-auto right-0 left-0 top-2"
        show={showSuccessCopy}
      />
      <div className="flex flex-col md:mt-6 w-full md:px-6 md:h-auto -mt-[60px] h-full">
        <div className="flex flex-col md:items-center md:justify-center">
          {/* Modal icon */}
          {type === ModalTypeToDisplay.RefundRequested ? (
            <SearchTransactionIcon customStyle="mb-4 mr-0 mt-0" />
          ) : (
            <IoMdCheckmarkCircle
              className="mb-4"
              style={{ color: "#0CC72C", width: "49.5px", height: "49.5px" }}
            />
          )}

          <div className="font-bold text-2xl md:text-2xl md:leading-8 text-dark-900 md:text-dark-1000 md:text-center">
            {titles[type]}
          </div>
          <div
            className={clsx(
              "text-sm lg:text-base leading-5  text-dark-700 mt-1 mb-4 md:text-center",
              {
                "md:w-10/12": type === ModalTypeToDisplay.RefundRequested,
              },
              {
                "md:w-8/12": type !== ModalTypeToDisplay.RefundRequested,
              },
            )}
          >
            {descriptions[type]}
          </div>
        </div>

        <span className="text-xs xl:tracking-wider text-dark-500 mb-8 md:mb-7 items-center md:flex md:justify-center">
          TX Hash:
          <button
            type="button"
            onClick={() => handleOnCopy(transactionHash)}
            title={transactionHash}
            className="text-dark-900 px-2 py-1 ml-2 bg-dark-200 rounded-[20px]"
          >
            {transactionHash && truncateTextFromMiddle(transactionHash, 15)}
          </button>
        </span>

        {/* Horizontal line */}
        <div className="h-px bg-dark-200 w-full md:mb-5 mb-6 py-px" />

        <div className="text-dark-900 text-lg lg:text-xl font-semibold md:mb-6 mb-8 tracking-[0.01em]">
          Transaction details
        </div>

        <div className="flex justify-between">
          <span className="text-dark-700 leading-5">
            {firstRowTitles[type]}
          </span>
          <span className="text-dark-1000 leading-5">
            {firstRowResult[type]}
          </span>
        </div>

        <div className="flex justify-between md:mt-8 mt-10">
          <span className="text-dark-700 leading-5">
            {secondRowTitles[type]}
          </span>
          <span className="text-dark-1000 break-words w-6/12 text-right leading-5">
            {secondRowResult[type]}
          </span>
        </div>
        {/* To remove 'invisible' component in refund requested state */}
        {type !== ModalTypeToDisplay.RefundRequested && (
          <div className="flex justify-between md:mt-8 mt-10">
            <span className="text-dark-700 leading-5">
              {thirdRowTitles[type]}
            </span>
            <span className="text-dark-1000 break-words w-6/12 text-right leading-5">
              {thirdRowResult[type]}
            </span>
          </div>
        )}

        <div
          className={clsx(
            "flex flex-col justify-end h-full items-center",
            {
              "mt-10 mb-8": type === ModalTypeToDisplay.RefundRequested,
            },
            {
              "md:mt-[104px] md:mb-4":
                type !== ModalTypeToDisplay.RefundRequested,
            },
          )}
        >
          <ActionButton
            isExternalArrowIcon
            label={buttonLabels[type]}
            customIconStyle="ml-2"
            customStyle="bg-dark-1000 text-sm lg:text-base lg:!py-3 lg:px-[72px] lg:w-[418px] max-w-[418px] min-w-[240px] min-h-[48px] lg:min-h-[52px]"
            onClick={() => {
              window.open(
                externalLinkButtonUrls[type],
                "_blank",
                "noopener noreferrer",
              );
            }}
          />
          {type === ModalTypeToDisplay.Completed && (
            <div className="mt-4 text-center flex flex-col justify-end">
              <GoToAnotherTransaction onClick={onBack} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
