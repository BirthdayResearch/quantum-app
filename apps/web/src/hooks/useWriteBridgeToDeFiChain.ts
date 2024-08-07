/**
 * Hook to write `bridgeToDeFiChain` function from our own BridgeV1 contract
 */

import { parseEther, parseUnits, toBytes, toHex } from "viem";
import { useEffect } from "react";
import {
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { useContractContext } from "@contexts/ContractContext";
import { Erc20Token } from "types";
import { FormOptions, useNetworkContext } from "@contexts/NetworkContext";
import { ETHEREUM_SYMBOL, METAMASK_REJECT_MESSAGE } from "../constants";

export interface EventErrorI {
  customErrorDisplay?:
    | "InsufficientAllowanceError"
    | "UserRejectedRequestError";
  message: string;
}

interface BridgeToDeFiChainI {
  receiverAddress: string;
  transferAmount: number;
  tokenName: Erc20Token;
  tokenDecimals: number;
  hasEnoughAllowance: boolean;
  onBridgeTxnSettled: () => void;
  setEventError: (error: EventErrorI | undefined) => void;
}

export default function useWriteBridgeToDeFiChain({
  receiverAddress,
  transferAmount,
  tokenName,
  tokenDecimals,
  hasEnoughAllowance,
  onBridgeTxnSettled,
  setEventError,
}: BridgeToDeFiChainI) {
  const { BridgeV1, BridgeQueue, Erc20Tokens } = useContractContext();
  const { typeOfTransaction } = useNetworkContext();
  const sendingFromETH = (tokenName as string) === ETHEREUM_SYMBOL;

  const handlePrepContractError = (err) => {
    let customErrorDisplay: EventErrorI["customErrorDisplay"];
    const errorMsg = err.message?.toLowerCase() ?? "";
    const testnetAllowanceErr = errorMsg.includes("insufficient allowance");
    const mainnetAllowanceErr =
      (errorMsg.includes("safeerc20: low-level call failed") ||
        errorMsg.includes("transfer amount exceeds allowance")) && // EUROC token throws different error message on mainnet
      !hasEnoughAllowance &&
      !sendingFromETH;
    if (testnetAllowanceErr || mainnetAllowanceErr) {
      // Need to request approval from user - Insufficient allowance
      customErrorDisplay = "InsufficientAllowanceError";
    }

    setEventError({
      customErrorDisplay,
      message: err?.message,
    });
  };

  const handleWriteContractError = (err) => {
    let customErrorMessage;
    let customErrorDisplay: EventErrorI["customErrorDisplay"];
    if (err?.message?.includes(METAMASK_REJECT_MESSAGE)) {
      customErrorDisplay = "UserRejectedRequestError";
      customErrorMessage =
        "The transaction was rejected in your wallet. No funds have been transferred. Please retry your transaction.";
    }

    setEventError({
      customErrorDisplay,
      message: customErrorMessage ?? err?.message,
    });
  };

  // Prepare write contract for `bridgeToDeFiChain` function
  const { config: bridgeConfig, refetch: refetchBridge } =
    usePrepareContractWrite({
      address:
        typeOfTransaction === FormOptions.INSTANT
          ? BridgeV1.address
          : BridgeQueue.address,
      abi:
        typeOfTransaction === FormOptions.INSTANT
          ? BridgeV1.abi
          : BridgeQueue.abi,
      functionName: "bridgeToDeFiChain",
      args: [
        toHex(new Uint8Array(toBytes(receiverAddress))),
        Erc20Tokens[tokenName].address,
        sendingFromETH
          ? 0 // ETH amount is set inside `value` field below
          : parseUnits(`${transferAmount}`, tokenDecimals).toString(),
      ],
      ...(sendingFromETH
        ? {
            value: parseEther(`${transferAmount}`),
          }
        : {}),
      onError: handlePrepContractError,
    });

  // Write contract for `bridgeToDeFiChain` function
  const {
    data: bridgeContract,
    write: writeBridgeToDeFiChain,
    error: writeBridgeTxnError,
  } = useContractWrite(bridgeConfig);

  // Wait and get result from write contract for `bridgeToDeFiChain` function
  const {
    error: bridgeTxnError,
    isSuccess: isBridgeTxnCreated,
    isLoading: isBridgeTxnLoading,
  } = useWaitForTransaction({
    hash: bridgeContract?.hash,
    onSettled: onBridgeTxnSettled,
  });

  useEffect(() => {
    if (writeBridgeTxnError || bridgeTxnError) {
      handleWriteContractError(writeBridgeTxnError ?? bridgeTxnError);
    }
  }, [writeBridgeTxnError, bridgeTxnError]);

  return {
    isBridgeTxnLoading,
    isBridgeTxnCreated,
    refetchBridge,
    writeBridgeToDeFiChain,
    transactionHash: bridgeContract?.hash,
  };
}
