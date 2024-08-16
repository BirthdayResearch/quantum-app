import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { FiClipboard } from "react-icons/fi";
import { IoCloseCircle } from "react-icons/io5";
import { HiLockClosed } from "react-icons/hi";
import { fromAddress } from "@defichain/jellyfish-address";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import useResponsive from "@hooks/useResponsive";
import useAutoResizeTextArea from "@hooks/useAutoResizeTextArea";
import {
  EnvironmentNetwork,
  getJellyfishNetwork,
} from "@waveshq/walletkit-core";
import { Network } from "types";
import Tooltip from "./commons/Tooltip";
import MetaMaskIconSmall from "./icons/MetaMaskIconSmall";

interface Props {
  blockchain: Network;
  label: string;
  disabled?: boolean;
  readOnly?: boolean;
  addressInput: string;
  onAddressInputChange: (address: string) => void;
  onAddressInputError: (hasError: boolean) => void;
  isPrimary?: boolean;
  customMessage?: string;
  testId: string;
}

/**
 * Displays wallet address with verified badge
 * Acts like a 'clone' for textarea, since ::after pseudo doesnt work for textarea
 * When displayed, textarea is hidden
 */
function AddressWithVerifiedBadge({
  value,
  onClick,
  isPrimary,
}: {
  value: string;
  onClick: () => void;
  isPrimary: boolean;
}): JSX.Element {
  const { isLg } = useResponsive();
  return (
    <div
      role="button"
      className={clsx(
        "relative mr-10 w-full break-all bg-transparent text-dark-1000 after:absolute focus:outline-none",
        isLg
          ? "after:-bottom-1 after:ml-2 after:content-[url('/verified-24x24.svg')]"
          : "after:ml-1 after:content-[url('/verified-20x20.svg')]",
        isPrimary ? "text-sm lg:text-base" : "text-sm",
      )}
      onClick={() => onClick()}
      onKeyDown={() => {}}
      tabIndex={0}
    >
      {value}
    </div>
  );
}

export default function WalletAddressInput({
  blockchain,
  label,
  disabled = false,
  readOnly = false,
  addressInput,
  onAddressInputChange,
  onAddressInputError,
  isPrimary = true,
  customMessage,
  testId,
}: Props): JSX.Element {
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [placeholder, setPlaceholder] = useState<string>("");
  const [error, setError] = useState({ message: "", isError: false });
  const [copiedFromClipboard, setCopiedFromClipboard] = useState(false);

  const { isConnected, address } = useAccount();
  const { networkEnv } = useNetworkEnvironmentContext();
  const { isMobile } = useResponsive();
  useAutoResizeTextArea(textAreaRef.current, [addressInput, placeholder]);

  const validateAddressInput = (input: string): void => {
    let isValid = false;
    if (blockchain === Network.Ethereum) {
      isValid = isAddress(input);
    } else {
      const decodedAddress = fromAddress(
        input,
        getJellyfishNetwork(networkEnv).name,
      );
      isValid = decodedAddress !== undefined;
    }
    setIsValidAddress(isValid);
  };

  const handlePasteBtnClick = async () => {
    if (disabled) {
      return;
    }
    const copiedText = await navigator.clipboard.readText();
    if (copiedText) {
      onAddressInputChange(copiedText);
      setCopiedFromClipboard(true);
    }
  };

  const handleFocusWithCursor = () => {
    if (disabled) {
      return;
    }

    setIsFocused(true);
    setTimeout(() => {
      // Only added timeout for ref's unexplained delay
      const textArea = textAreaRef.current;
      const cursorPosition = addressInput.length;
      if (textArea) {
        textArea.setSelectionRange(cursorPosition, cursorPosition);
        textArea.focus();
      }
    }, 0);
  };

  useEffect(() => {
    const displayedName = Network[blockchain];
    if (
      networkEnv === EnvironmentNetwork.TestNet &&
      blockchain === Network.DeFiChain
    ) {
      setPlaceholder(`Enter ${displayedName} (${networkEnv}) address`);
    } else {
      setPlaceholder(`Enter ${displayedName} address`);
    }
  }, [blockchain, networkEnv, isConnected]);

  useEffect(() => {
    if (addressInput === "") {
      setIsValidAddress(false);
      return;
    }
    validateAddressInput(addressInput);
  }, [addressInput, networkEnv, blockchain]);

  useEffect(() => {
    let message: string;
    const isDeFiChain = blockchain === "DeFiChain";
    const hasInvalidInput = !!(addressInput && !isValidAddress);
    if (customMessage !== undefined) {
      message = customMessage;
    } else if (hasInvalidInput) {
      const dfiNetwork = isDeFiChain ? ` ${networkEnv}` : "";
      message = `Use correct address for ${Network[blockchain]}${dfiNetwork}`;
    } else {
      const isTestnet =
        isDeFiChain &&
        [
          EnvironmentNetwork.TestNet,
          EnvironmentNetwork.LocalPlayground,
        ].includes(networkEnv);
      message = isTestnet
        ? `You are on a ${networkEnv} network. Make sure to only use a ${networkEnv} address`
        : "";
    }
    setError({ message, isError: hasInvalidInput });
    onAddressInputError(!addressInput || !isValidAddress);
  }, [addressInput, isValidAddress, blockchain, networkEnv, customMessage]);

  useEffect(() => {
    if (copiedFromClipboard) {
      setTimeout(() => setCopiedFromClipboard(false), 2000);
    }
  }, [copiedFromClipboard]);

  const showErrorBorder = addressInput && !isValidAddress;
  const showVerifiedBadge = isValidAddress && !isFocused;
  return (
    <>
      {/* Address label */}
      <div
        className={clsx({
          "md:h-5 lg:h-7 group relative mb-2 flex items-center lg:mb-2":
            isPrimary,
        })}
      >
        <span className="pl-5 text-xs font-semibold xl:tracking-wider lg:text-sm text-dark-900 tracking-normal lg:tracking-[0.02em] ">
          {label}
        </span>
        {/*  Network environment */}

        <div
          className={clsx(
            "absolute right-0 rounded bg-valid px-2 py-1 text-2xs text-dark-00  transition duration-300 lg:text-xs",
            copiedFromClipboard ? "opacity-100" : "opacity-0",
          )}
        >
          Added from clipboard
        </div>
      </div>

      {/* Main wallet input container */}
      <div
        className={clsx(
          "relative flex min-h-[48px] items-center rounded-lg border py-2.5 pr-3.5 pl-4",
          {
            "bg-dark-100 opacity-30": disabled,
            "border-error": showErrorBorder,
            "before:dark-gradient-2 z-0 border-transparent before:-inset-[1px] before:rounded-lg before:p-px":
              isFocused && !showErrorBorder,
            "border-dark-300 hover:border-dark-500": !(
              disabled ||
              showErrorBorder ||
              isFocused
            ),
            "pointer-events-none bg-dark-100": readOnly,
            "lg:px-5 lg:py-3": isPrimary,
          },
        )}
      >
        {/* Paste icon with tooltip */}
        {isPrimary && (
          <Tooltip
            content="Paste from clipboard"
            containerClass={clsx("mr-3 shrink-0 !p-0", {
              "cursor-pointer hover:bg-dark-200 active:dark-btn-pressed":
                !disabled,
            })}
            disableTooltip={disabled || isMobile} // Disable tooltip for mobile
          >
            <FiClipboard
              size={24}
              className="text-dark-1000"
              onMouseDown={handlePasteBtnClick}
            />
          </Tooltip>
        )}

        {/* Copy of textarea */}
        {showVerifiedBadge && (
          <AddressWithVerifiedBadge
            value={addressInput}
            onClick={handleFocusWithCursor}
            isPrimary={isPrimary}
          />
        )}

        {/* Textarea input */}
        <textarea
          data-testid={testId}
          ref={textAreaRef}
          className={clsx(
            `max-h-36 grow resize-none bg-transparent text-sm tracking-[0.01em] text-dark-1000 focus:outline-none py-0.5`,
            { hidden: showVerifiedBadge },
            isFocused
              ? "placeholder:text-dark-300"
              : "placeholder:text-dark-500",
            isPrimary
              ? "text-sm tracking-[0.01em] text-dark-1000 placeholder:text-sm lg:text-base lg:placeholder:text-base"
              : "text-sm tracking-[0.01em] text-dark-1000 placeholder:text-sm",
          )}
          placeholder={placeholder}
          value={addressInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onAddressInputChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
          disabled={disabled}
          spellCheck={false}
        />

        {/* Clear icon */}
        {((isFocused && addressInput) || (addressInput && !isValidAddress)) && (
          <IoCloseCircle
            size={20}
            className="ml-2 mr-1 shrink-0 cursor-pointer fill-dark-500"
            onMouseDown={() => {
              onAddressInputChange("");
              handleFocusWithCursor();
            }}
          />
        )}

        {!showVerifiedBadge && blockchain === Network.Ethereum && (
          <button
            type="button"
            onClick={() => {
              if (address) {
                onAddressInputChange(address);
              }
            }}
            className={clsx(
              "flex items-center lg:min-w-[130px] font-bold text-dark-800 text-2xs rounded-md h-[28px] px-3 border-[0.5px]",
              "border-dark-200",
              "active:border-dark-500 active:opacity-70",
              "hover:border-dark-500",
            )}
          >
            <MetaMaskIconSmall />
            <span className="ml-1.5">
              <span className="hidden lg:block">USE ADDRESS</span>
              <span className="block lg:hidden">USE</span>
            </span>
          </button>
        )}

        {readOnly && (
          <span className="self-center">
            <HiLockClosed size={18} className="text-dark-800" />
          </span>
        )}
      </div>

      {/* Error and warning messages */}
      <span
        className={clsx(
          "block px-4 pt-2 text-xs lg:px-6 lg:text-sm empty:before:content-['*'] empty:before:opacity-0",
          error.isError ? "text-error" : "text-warning",
        )}
      >
        {error.message && !disabled ? error.message : ""}
      </span>
    </>
  );
}
