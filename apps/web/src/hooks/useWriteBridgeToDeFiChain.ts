/**
 * Hook to write `bridgeToDeFiChain` function from our own BridgeV1 contract
 */

import BigNumber from "bignumber.js";
import { ethers, utils } from "ethers";
import { useEffect } from "react";
import {
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { useContractContext } from "@contexts/ContractContext";
import { Erc20Token } from "types";
import { ETHEREUM_SYMBOL } from "../constants";

export interface EventErrorI {
  customErrorDisplay?:
    | "InsufficientAllowanceError"
    | "UserRejectedRequestError";
  message: string;
}

interface BridgeToDeFiChainI {
  receiverAddress: string;
  transferAmount: BigNumber;
  tokenName: Erc20Token;
  tokenDecimals: number | "gwei";
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
  const { BridgeV1, Erc20Tokens } = useContractContext();
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
    if (err?.name === "UserRejectedRequestError") {
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
      address: BridgeV1.address,
      abi: BridgeV1.abi,
      functionName: "bridgeToDeFiChain",
      args: [
        utils.hexlify(utils.toUtf8Bytes(receiverAddress)) as `0x${string}`,
        Erc20Tokens[tokenName].address,
        sendingFromETH
          ? 0 // ETH amount is set inside overrides' `value` field
          : utils.parseUnits(transferAmount.toFixed(), tokenDecimals),
      ],
      ...(sendingFromETH
        ? {
            overrides: {
              value: ethers.utils.parseEther(transferAmount.toFixed()),
            },
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
