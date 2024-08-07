import * as React from "react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import Modal from "@components/commons/Modal";
import dayjs from "dayjs";
import { FiArrowUpRight } from "react-icons/fi";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { ModalTypeToDisplay, Network } from "types";
import ActionButton from "@components/commons/ActionButton";
import Link from "next/link";
import truncateTextFromMiddle from "@utils/textHelper";
import { QueueTxData } from "@components/erc-transfer/QueryTransactionModal";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { SuccessCopy } from "@components/QrAddress";
import GoToAnotherTransaction from "./GoToAnotherTransaction";
import { useRefundMutation } from "../../store";
import mapTokenToNetworkName from "../../utils/mapTokenToNetworkName";

interface TransactionInProgressModalProps {
  type?: ModalTypeToDisplay;
  onClose: () => void;
  onBack: () => void;
  isOpen: boolean;
  queueModalDetails?: QueueTxData;
  onTransactionFound: (modalTypeToDisplay: any) => void;
}

export enum FormStatus {
  RefundInProgress = "Refund in progress",
  RefundRequested = "Refund requested",
  RefundRequestFailed = "Refund request failed",
}

const titles = {
  [ModalTypeToDisplay.Pending]: "Transaction in queue",
  [ModalTypeToDisplay.Processing]: "Transaction processing",
  [ModalTypeToDisplay.RefundInProgress]: "Refund in progress",
  [ModalTypeToDisplay.Unsuccessful]: "Transaction unsuccessful",
  [FormStatus.RefundRequestFailed]: "Refund request unsuccessful",
};

const descriptions = {
  [ModalTypeToDisplay.Pending]:
    "Your transaction will be processed within the next 72 hours.",
  [ModalTypeToDisplay.Processing]:
    "Your transaction is currently being confirmed on-chain. Once completed, it will be in Queue.",
  [ModalTypeToDisplay.RefundInProgress]:
    "Refund will be processed within the next 72 hours.",
  [ModalTypeToDisplay.Unsuccessful]:
    "The queue transaction couldn't be processed. Please try again.",
  [FormStatus.RefundRequestFailed]:
    "We regret to inform you that the refund request was not successful",
};

const amountLabel = {
  [ModalTypeToDisplay.Processing]: "Amount to receive",
  [ModalTypeToDisplay.Pending]: "Amount to receive",
  [ModalTypeToDisplay.RefundInProgress]: "Amount to refund",
  [ModalTypeToDisplay.Unsuccessful]: "Amount to receive",
};

export default function TransactionInProgressModal({
  type,
  onClose,
  onBack,
  isOpen,
  queueModalDetails,
  onTransactionFound,
}: TransactionInProgressModalProps): JSX.Element {
  const { copy } = useCopyToClipboard();
  const [showSuccessCopy, setShowSuccessCopy] = useState(false);
  const { amount, token, transactionHash, initiatedDate, destinationAddress } =
    queueModalDetails ?? {};
  const tokenToDisplay = mapTokenToNetworkName(Network.DeFiChain, token);
  const [refund] = useRefundMutation();
  const [formStatus, setFormStatus] = useState<FormStatus>();
  const handleOnCopy = (text) => {
    copy(text);
    setShowSuccessCopy(true);
  };

  const requestRefund = async (): Promise<void> => {
    try {
      setFormStatus(FormStatus.RefundInProgress);
      await refund({
        txnHash: transactionHash,
      }).unwrap();
      setFormStatus(FormStatus.RefundRequested);
    } catch (err) {
      setFormStatus(FormStatus.RefundRequestFailed);
    }
  };

  useEffect(() => {
    if (formStatus === FormStatus.RefundRequested) {
      setFormStatus(undefined); // set back to initial state
      onTransactionFound(ModalTypeToDisplay.RefundRequested);
    }
  }, [formStatus]);

  useEffect(() => {
    if (showSuccessCopy) {
      setTimeout(() => setShowSuccessCopy(false), 2000);
    }
  }, [showSuccessCopy]);

  if (type === undefined) {
    // eslint-disable-next-line
    return <></>;
  }

  return (
    <>
      {formStatus === FormStatus.RefundRequested && (
        <Modal isOpen onClose={onClose}>
          <div className="flex flex-col items-center mt-6 mb-14">
            <div className="w-24 h-24 border border-brand-200 border-b-transparent rounded-full animate-spin" />
            <span className="font-bold text-2xl text-dark-900 mt-12">
              {titles[ModalTypeToDisplay.RefundInProgress]}
            </span>
            <span className="text-dark-900 mt-2 text-center">
              {descriptions[ModalTypeToDisplay.RefundInProgress]}
            </span>
          </div>
        </Modal>
      )}

      {formStatus === FormStatus.RefundRequestFailed && (
        <Modal
          isOpen
          onClose={() => {
            setFormStatus(undefined); // set back to initial state
            onClose();
          }}
        >
          <div className="flex flex-col items-center mt-6 mb-14">
            <IoMdInformationCircleOutline
              size={73.33}
              className="rotate-180 text-[#E54545]"
            />

            <span className="font-bold text-2xl text-dark-900 text-center mt-10">
              {titles[FormStatus.RefundRequestFailed]}
            </span>
            <span
              className={clsx(
                "mt-2 w-5/6",
                "text-dark-700 text-center text-[18px] leading-6",
              )}
            >
              {descriptions[FormStatus.RefundRequestFailed]}
            </span>

            <ActionButton
              label="Try again"
              customStyle="!text-lg !px-[72px] !py-3 !w-fit mt-12 bg-dark-1000 font-semibold"
              onClick={() => {
                setFormStatus(undefined);
              }}
            />
            <ActionButton
              label="Get support"
              variant="secondary"
              customStyle="!px-[72px] !py-3 !w-fit mt-2"
              onClick={() => {
                window.open(
                  "https://docs.google.com/forms/d/e/1FAIpQLSewBvBntogPdXe5KIlwfYp7X_ODPAMwrRVL1R6T1k5LdUq52A/viewform",
                  "_blank",
                );
              }}
            />
          </div>
        </Modal>
      )}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setFormStatus(undefined); // set back to initial state
          onClose();
        }}
      >
        <SuccessCopy
          containerClass="m-auto right-0 left-0 top-2"
          show={showSuccessCopy}
        />
        <div className="flex flex-col md:mt-6 md:mb-4 w-full md:px-6 h-full md:h-auto -mt-[60px]">
          {type === ModalTypeToDisplay.Unsuccessful && (
            <Link
              href="https://birthday-research.gitbook.io/quantum-documentation/troubleshooting/error-codes"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              <span className="text-xs text-error flex items-center">
                Error code 12
                <FiArrowUpRight size={16} className="inline ml-1" />
              </span>
            </Link>
          )}
          <div className="font-bold text-2xl md:text-xl lg:text-2xl leading-8 md:leading-7 lg:!leading-8 text-dark-1000 tracking-[0.01em] w-10/12">
            {titles[type]}
          </div>
          <div className="text-sm lg:text-base leading-5 w-10/12 md:w-full text-dark-700 mt-1 mb-4 md:mb-5 lg:mb-4">
            {descriptions[type]}
          </div>

          <span className="text-xs xl:tracking-wider text-dark-500 mb-8 md:mb-7">
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

          <div className="h-px bg-dark-200 w-full md:mb-5 mb-6" />

          <div className="text-dark-900 md:text-xl font-semibold md:mb-6 mb-8">
            Transaction details
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-700">Date initiated</span>
            <span className="text-dark-1000">
              {dayjs(initiatedDate).format("DD/MM/YYYY, HH:mm A")}
            </span>
          </div>
          <div className="flex items-center justify-between md:mt-8 mt-10">
            <span className="text-dark-700">{amountLabel[type]}</span>
            <span className="text-dark-1000">{`${amount} ${tokenToDisplay}`}</span>
          </div>
          {type === ModalTypeToDisplay.RefundInProgress && (
            <div className="flex justify-between md:mt-8 mt-10">
              <span className="text-dark-700 w-2/4">Destination address</span>
              <span className="text-dark-1000 break-all w-2/4 text-right">
                {destinationAddress}
              </span>
            </div>
          )}

          {(type === ModalTypeToDisplay.Processing ||
            type === ModalTypeToDisplay.Pending ||
            type === ModalTypeToDisplay.RefundInProgress) && (
            <div className="mt-14 text-center h-full flex flex-col justify-end">
              <GoToAnotherTransaction onClick={onBack} />
            </div>
          )}
          {type === ModalTypeToDisplay.Unsuccessful && (
            <div className="mt-12 md:mt-8 lg:mt-10 flex flex-col items-center h-full items-end">
              <ActionButton
                label="Request a refund"
                customStyle="bg-dark-1000 text-sm lg:text-lg lg:!py-3 lg:px-[72px] lg:w-fit min-w-[240px] min-h-[48px] lg:min-h-[52px]"
                onClick={async () => {
                  await requestRefund();
                }}
              />
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
