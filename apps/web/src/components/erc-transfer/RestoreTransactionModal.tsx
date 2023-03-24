import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { ethers } from "ethers";
import ActionButton from "@components/commons/ActionButton";
import Modal from "@components/commons/Modal";
import { useContractContext } from "@contexts/ContractContext";
import useAutoResizeTextArea from "@hooks/useAutoResizeTextArea";
import { FiClipboard } from "react-icons/fi";
import { IoCloseCircle } from "react-icons/io5";
import Tooltip from "@components/commons/Tooltip";
import useResponsive from "@hooks/useResponsive";
import { useStorageContext } from "@contexts/StorageContext";

export interface ModalConfigType {
  title: string;
  message: string;
  onClose: () => void;
}

export default function RestoreTransactionModal({
  title,
  message,
  onClose,
}: ModalConfigType) {
  const { isMobile } = useResponsive();
  const { setStorage } = useStorageContext();
  const { BridgeV1, EthereumRpcUrl } = useContractContext();

  const [txnAddress, setTxnAddress] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isNotValidTxn, setIsNotValidTxn] = useState<boolean>(false);
  const [copiedFromClipboard, setCopiedFromClipboard] =
    useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextArea(textAreaRef.current, [
    txnAddress,
    "Enter Transaction ID",
  ]);

  const provider = new ethers.providers.JsonRpcProvider(EthereumRpcUrl);
  const bridgeIface = new ethers.utils.Interface(BridgeV1.abi);

  const checkTXnHash = async () => {
    try {
      const receipt = await provider.getTransaction(txnAddress);
      const decodedData = bridgeIface.parseTransaction({ data: receipt.data });
      if (receipt && decodedData?.name !== "bridgeToDeFiChain") {
        setIsNotValidTxn(true);
        return;
      }
      if (receipt) {
        setStorage("unconfirmed", txnAddress);
        setIsNotValidTxn(false);
        onClose();
        return;
      }
      setIsNotValidTxn(true);
    } catch (error) {
      setIsNotValidTxn(true);
    }
  };

  const handleFocusWithCursor = () => {
    setIsFocused(true);
    setTimeout(() => {
      // Only added timeout for ref's unexplained delay
      const textArea = textAreaRef.current;
      const cursorPosition = txnAddress.length;
      if (textArea) {
        textArea.setSelectionRange(cursorPosition, cursorPosition);
        textArea.focus();
      }
    }, 0);
  };

  const invalidTxnHash = txnAddress && isNotValidTxn;

  const handlePasteBtnClick = async () => {
    setIsNotValidTxn(false);
    const copiedText = await navigator.clipboard.readText();
    if (copiedText) {
      setTxnAddress(copiedText);
      setCopiedFromClipboard(true);
    }
  };

  useEffect(() => {
    if (copiedFromClipboard) {
      setTimeout(() => setCopiedFromClipboard(false), 2000);
    }
  }, [copiedFromClipboard]);

  return (
    <Modal isOpen onClose={onClose}>
      <div className="flex flex-col mt-6 mb-14 w-full px-6">
        <div className="font-bold text-xl lg:text-2xl text-dark-900">
          {title}
        </div>
        <div className="text-sm lg:text-base lg:leading-5 w-full text-dark-700 mt-2">
          {message}
        </div>

        <div className="md:h-5 lg:h-7 group relative flex items-center mt-8">
          <span className="text-xs font-semibold xl:tracking-wider lg:text-base text-dark-900">
            Transaction ID
          </span>
          <div
            className={clsx(
              "absolute right-0 rounded bg-valid px-2 py-1 text-2xs text-dark-00 transition duration-300 lg:text-xs",
              copiedFromClipboard ? "opacity-100" : "opacity-0"
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
            }
          )}
        >
          {/* Paste icon with tooltip */}
          <Tooltip
            content="Paste from clipboard"
            containerClass="mr-3 lg:mr-6 shrink-0 cursor-pointer hover:bg-dark-200 active:dark-btn-pressed"
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
                : "placeholder:text-dark-500"
            )}
            placeholder="Enter Transaction ID"
            value={txnAddress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setTxnAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            spellCheck={false}
          />

          {/* Clear icon */}
          {((isFocused && txnAddress) || (txnAddress && isNotValidTxn)) && (
            <IoCloseCircle
              size={20}
              className="ml-2 mr-1 shrink-0 cursor-pointer fill-dark-500"
              onMouseDown={() => {
                setTxnAddress("");
                setIsNotValidTxn(false);
                handleFocusWithCursor();
              }}
            />
          )}
        </div>

        {/* Error messages */}
        {invalidTxnHash && (
          <span className="block px-4 pt-2 text-xs lg:px-6 lg:text-sm empty:before:content-['*'] empty:before:opacity-0 text-error">
            Enter a valid Ethereum txid performed on Quantum
          </span>
        )}

        <div className="mt-8 lg:px-[31px]">
          <ActionButton
            label="Restore transaction"
            customStyle="bg-dark-1000 md:px-6 text-lg lg:!py-3 lg:px-8 xl:px-14"
            disabled={txnAddress === ""}
            onClick={checkTXnHash}
          />
        </div>
      </div>
    </Modal>
  );
}
