import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { createPublicClient, http, decodeFunctionData } from "viem";
import ActionButton from "@components/commons/ActionButton";
import Modal from "@components/commons/Modal";
import { useContractContext } from "@contexts/ContractContext";
import useAutoResizeTextArea from "@hooks/useAutoResizeTextArea";
import { FiClipboard } from "react-icons/fi";
import { IoCloseCircle } from "react-icons/io5";
import Tooltip from "@components/commons/Tooltip";
import useResponsive from "@hooks/useResponsive";
import { useStorageContext } from "@contexts/StorageContext";
import { ModalTypeToDisplay, Queue, Network } from "types";
import checkEthTxHashHelper from "@utils/checkEthTxHashHelper";
import mapTokenToNetworkName from "@utils/mapTokenToNetworkName";
import {
  useGetQueueTransactionQuery,
  useLazyGetEVMTxnDetailsQuery,
} from "@store/index";
import { useQueueStorageContext } from "../../layouts/contexts/QueueStorageContext";
import { useNetworkContext } from "../../layouts/contexts/NetworkContext";

export interface QueueTxData {
  amount?: string;
  token?: string;
  transactionHash?: string;
  destinationAddress?: string;
  initiatedDate?: Date;
}

export interface ModalConfigType {
  title: string;
  message: string;
  inputLabel: string;
  inputPlaceholder: string;
  buttonLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onTransactionFound?: (modalTypeToDisplay: any) => void;
  setAdminSendTxHash?: (txHash: string) => void;
  type: QueryTransactionModalType;
  setQueueModalDetails?: (details: QueueTxData) => void;
}

export enum QueryTransactionModalType {
  RecoverInstantTransaction,
  RecoverQueueTransaction,
  SearchQueueTransaction,
}

const statusToModalTypeMap = {
  DRAFT: ModalTypeToDisplay.Processing,
  COMPLETED: ModalTypeToDisplay.Completed,
  REFUND_REQUESTED: ModalTypeToDisplay.RefundInProgress,
  REFUNDED: ModalTypeToDisplay.Refunded,
  IN_PROGRESS: ModalTypeToDisplay.Pending,
};

export default function QueryTransactionModal({
  title,
  message,
  inputLabel,
  inputPlaceholder,
  buttonLabel,
  isOpen,
  onClose,
  onTransactionFound,
  setAdminSendTxHash,
  type,
  setQueueModalDetails,
}: ModalConfigType) {
  const { isMobile } = useResponsive();
  const { setStorage } = useStorageContext();
  const { setStorage: setQueueStorage } = useQueueStorageContext();
  const { BridgeV1, BridgeQueue, EthereumRpcUrl } = useContractContext();
  const [getQueueTransaction] = useGetQueueTransactionQuery();

  const [transactionInput, setTransactionInput] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const [isValidTransaction, setIsValidTransaction] = useState(true);
  const [inputErrorMessage, setInputErrorMessage] = useState<string>("");
  const [copiedFromClipboard, setCopiedFromClipboard] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextArea(textAreaRef.current, [transactionInput]);
  const isValidEthTxHash = checkEthTxHashHelper(transactionInput);

  const [getEVMTxnDetails] = useLazyGetEVMTxnDetailsQuery();

  const client = createPublicClient({
    transport: http(EthereumRpcUrl),
  });

  const { selectedQueueNetworkA } = useNetworkContext();

  const displayModalForQueueType = (queuedTransaction: Queue) => {
    if (queuedTransaction.adminQueue && setAdminSendTxHash !== undefined) {
      const adminQueueTxHash = queuedTransaction.adminQueue.sendTransactionHash;
      if (
        (queuedTransaction.status === "COMPLETED" ||
          queuedTransaction.status === "REFUNDED") &&
        adminQueueTxHash !== undefined &&
        adminQueueTxHash !== null
      ) {
        setAdminSendTxHash(adminQueueTxHash);
      }
    }

    if (
      setQueueModalDetails &&
      queuedTransaction.amount &&
      queuedTransaction.tokenSymbol
    ) {
      setQueueModalDetails({
        amount: queuedTransaction.amount,
        token: queuedTransaction.tokenSymbol,
        transactionHash: transactionInput,
        destinationAddress: queuedTransaction.defichainAddress,
        initiatedDate: queuedTransaction.createdAt,
      });
    }

    if (!onTransactionFound) {
      return;
    }

    const modalType = statusToModalTypeMap[queuedTransaction.status];
    const refundStatusList = ["IN_PROGRESS", "EXPIRED", "ERROR"];
    const currentDate = new Date();
    if (
      refundStatusList.includes(queuedTransaction.status) &&
      currentDate.getTime() >= new Date(queuedTransaction.expiryDate).getTime()
    ) {
      onTransactionFound(ModalTypeToDisplay.Unsuccessful);
    } else if (modalType) {
      onTransactionFound(modalType);
    } else {
      // Handle case where status is not in the map
      onTransactionFound(ModalTypeToDisplay.Pending);
    }
  };

  const getQueueToken = (tokenASymbol: string) => {
    const tokens = selectedQueueNetworkA.tokens.find(
      (token) => token.tokenB.symbol === tokenASymbol,
    );
    return tokens;
  };

  const restoreQueueTxn = async () => {
    const queue = await getQueueTransaction({
      txnHash: transactionInput,
    }).unwrap();

    if (queue.status !== "DRAFT") {
      setQueueStorage("confirmed-queue", transactionInput);
      onClose();
    }
    if (queue.tokenSymbol === null) {
      throw new Error("Invalid token symbol in queue txn");
    }

    const token = getQueueToken(queue.tokenSymbol);

    if (token === null || token === undefined) {
      throw new Error("Invalid token symbol in queue txn");
    }
    setQueueStorage("unconfirmed-queue", transactionInput);
    setQueueStorage("created-queue-txn-hash", transactionInput);
    setQueueStorage("transfer-amount-queue", queue.amount);
    setQueueStorage("transfer-display-symbol-A-queue", token!.tokenA.name);
    setQueueStorage("transfer-display-symbol-B-queue", token!.tokenB.name);
    setQueueStorage("dfc-address-queue", queue.defichainAddress);
  };

  async function getInstantTxnDetails() {
    const txnDetails = await getEVMTxnDetails({
      txnHash: transactionInput,
    }).unwrap();
    setStorage("unconfirmed", transactionInput);
    setStorage("transfer-amount", txnDetails.amount.toString());
    setStorage("destination-address", txnDetails.toAddress);

    const ethSymbolToDisplay = mapTokenToNetworkName(
      Network.Ethereum,
      // symbol and name for BTC for evm should both be WBTC https://etherscan.io/address/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
      // however as we are storing as BTC in the DB we would check for WBTC if symbol is BTC for Eth network
      txnDetails.symbol === "BTC" ? "WBTC" : txnDetails.symbol,
    );
    const dfcSymbolToDisplay = mapTokenToNetworkName(
      Network.DeFiChain,
      txnDetails.symbol,
    );
    if (ethSymbolToDisplay && dfcSymbolToDisplay) {
      setStorage("transfer-display-symbol-A", ethSymbolToDisplay);
      setStorage("transfer-display-symbol-B", dfcSymbolToDisplay);
    }
  }

  const checkTXnHash = async () => {
    if (!isValidEthTxHash) {
      setInputErrorMessage("Enter a valid transaction hash for Ethereum.");
      setIsValidTransaction(false);
      return;
    }
    try {
      setIsLoading(true);
      const receipt = await client.getTransaction({
        hash: transactionInput as `0x${string}`,
      });
      const decodedData = decodeFunctionData({
        abi:
          type === QueryTransactionModalType.RecoverInstantTransaction
            ? BridgeV1.abi
            : BridgeQueue.abi,
        data: receipt.input,
      });

      if (receipt && decodedData?.functionName !== "bridgeToDeFiChain") {
        setIsValidTransaction(false);
        return;
      }
      if (receipt) {
        setIsValidTransaction(true);

        if (type === QueryTransactionModalType.RecoverInstantTransaction) {
          // Both restore flow don't have to worry about overwriting tx that is in progress because recover tx modal is not accessible in confirmation UI
          await getInstantTxnDetails();
          onClose();
        } else if (type === QueryTransactionModalType.RecoverQueueTransaction) {
          await restoreQueueTxn();
          onClose();
        } else {
          // Calls Queue tx from endpoint
          const queuedTransaction = await getQueueTransaction({
            txnHash: transactionInput,
          }).unwrap();

          displayModalForQueueType(queuedTransaction);
        }
      }
    } catch (error) {
      if (type === QueryTransactionModalType.RecoverInstantTransaction) {
        setInputErrorMessage(
          "Invalid transaction hash. Please only enter instant transaction hash.",
        );
      } else {
        // search queue and recover queue
        setInputErrorMessage(
          "Invalid transaction hash. Please only enter queued transaction hash.",
        );
      }
      setIsValidTransaction(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocusWithCursor = () => {
    setIsFocused(true);
    setTimeout(() => {
      // Only added timeout for ref's unexplained delay
      const textArea = textAreaRef.current;
      const cursorPosition = transactionInput.length;
      if (textArea) {
        textArea.setSelectionRange(cursorPosition, cursorPosition);
        textArea.focus();
      }
    }, 0);
  };

  const invalidTxnHash = !!transactionInput && !isValidTransaction;

  const handlePasteBtnClick = async () => {
    setIsValidTransaction(true);
    const copiedText = await navigator.clipboard.readText();
    if (copiedText) {
      setTransactionInput(copiedText);
      setCopiedFromClipboard(true);
    }
  };

  useEffect(() => {
    if (copiedFromClipboard) {
      setTimeout(() => setCopiedFromClipboard(false), 2000);
    }
  }, [copiedFromClipboard]);

  useEffect(() => {
    setInputErrorMessage("");
    setIsValidTransaction(true);
  }, [transactionInput]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col mt-6 mb-4 w-full md:px-6">
        <div className="font-bold text-2xl md:text-xl lg:text-2xl text-dark-900">
          {title}
        </div>
        <div className="text-sm lg:text-base lg:leading-5 w-full text-dark-700 mt-1">
          {message}
        </div>

        <div className="md:h-5 lg:h-7 group relative flex items-center mt-8">
          <span className="text-xs font-semibold xl:tracking-wider lg:text-base text-dark-900">
            {inputLabel}
          </span>
          <div
            className={clsx(
              "absolute right-0 rounded bg-valid px-2 py-1 text-2xs text-dark-00 transition duration-300 lg:text-xs",
              copiedFromClipboard ? "opacity-100" : "opacity-0",
            )}
          >
            Added from clipboard
          </div>
        </div>

        <div
          className={clsx(
            "relative flex min-h-[52px] items-center rounded-lg border py-2.5 pr-3.5 pl-4 mt-2",
            {
              "border-error": invalidTxnHash,
              "before:dark-gradient-2 z-0 border-transparent before:-inset-[1px] before:rounded-lg before:p-px":
                isFocused && !invalidTxnHash,
              "border-dark-300 hover:border-dark-500": !(
                invalidTxnHash || isFocused
              ),
            },
          )}
        >
          {/* Paste icon with tooltip */}
          <Tooltip
            content="Paste from clipboard"
            containerClass="mr-3 shrink-0 cursor-pointer hover:bg-dark-200 active:dark-btn-pressed"
            disableTooltip={isMobile}
          >
            <FiClipboard
              size={20}
              className="text-dark-1000"
              onMouseDown={handlePasteBtnClick}
            />
          </Tooltip>

          {/* Textarea input */}
          <textarea
            ref={textAreaRef}
            className={clsx(
              `w-full h-6 grow resize-none bg-transparent text-sm lg:text-base leading-5 tracking-[0.01em] text-dark-1000 focus:outline-none`,
              isFocused
                ? "placeholder:text-dark-300"
                : "placeholder:text-dark-500",
            )}
            placeholder={inputPlaceholder}
            value={transactionInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setTransactionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            spellCheck={false}
          />

          {/* Clear icon */}
          {transactionInput.length > 0 && (
            <IoCloseCircle
              size={20}
              className="ml-2 mr-1 shrink-0 cursor-pointer fill-dark-500"
              onMouseDown={() => {
                setTransactionInput("");
                setIsValidTransaction(true);
                handleFocusWithCursor();
              }}
            />
          )}
        </div>

        {/* Error message */}
        {invalidTxnHash && (
          <span className="block pt-2 text-xs lg:text-sm empty:before:content-['*'] empty:before:opacity-0 text-error">
            {inputErrorMessage}
          </span>
        )}

        <div className="mt-12 md:mt-8 lg:mt-10 flex justify-center">
          <ActionButton
            label={isLoading ? "" : buttonLabel}
            customStyle="bg-dark-1000 text-sm lg:text-lg lg:!py-3 lg:px-[72px] lg:w-fit min-w-[251.72px] min-h-[48px] lg:min-h-[52px]"
            disabled={transactionInput === "" || isLoading}
            onClick={checkTXnHash}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Modal>
  );
}
