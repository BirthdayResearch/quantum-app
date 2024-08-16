import { parseUnits } from "viem";
import { erc20ABI, useContractReads } from "wagmi";
import { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import clsx from "clsx";
import { useContractContext } from "@contexts/ContractContext";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import useResponsive from "@hooks/useResponsive";
import useWriteApproveToken from "@hooks/useWriteApproveToken";
import useWriteBridgeToDeFiChain, {
  EventErrorI,
} from "@hooks/useWriteBridgeToDeFiChain";
import AlertInfoMessage from "@components/commons/AlertInfoMessage";
import ActionButton from "@components/commons/ActionButton";
import ErrorModal from "@components/commons/ErrorModal";
import Modal from "@components/commons/Modal";
import { Erc20Token, TransferData } from "types";
import { useStorageContext } from "@contexts/StorageContext";
import { useQueueStorageContext } from "@contexts/QueueStorageContext";
import { useQueueTransactionMutation } from "@store/index";
import {
  BridgeStatus,
  DISCLAIMER_MESSAGE,
  ETHEREUM_SYMBOL,
  GWEI_DECIMAL,
} from "../../constants";
import {
  FormOptions,
  useNetworkContext,
} from "../../layouts/contexts/NetworkContext";
import sleep from "../../utils/sleep";

export default function EvmToDeFiChainTransfer({
  data,
  onClose,
}: {
  data: TransferData;
  onClose: (noCloseWarning: boolean) => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string>();
  const [eventError, setEventError] = useState<EventErrorI>();
  const [hasPendingTx, setHasPendingTx] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(
    BridgeStatus.NoTxCreated,
  );
  const { isMobile } = useResponsive();
  const { networkEnv } = useNetworkEnvironmentContext();
  const { BridgeV1, BridgeQueue, Erc20Tokens, ExplorerURL } =
    useContractContext();
  const bridgingETH = data.from.tokenSymbol === ETHEREUM_SYMBOL;
  const { setStorage } = useStorageContext();
  const { setStorage: setQueueStorage } = useQueueStorageContext();
  const { typeOfTransaction } = useNetworkContext();
  const [queueTransaction] = useQueueTransactionMutation();

  // Read details from token contract
  const erc20TokenContract = {
    address: Erc20Tokens[data.from.tokenName].address,
    abi: erc20ABI,
  };
  const { data: readTokenData, refetch: refetchTokenData } = useContractReads({
    contracts: [
      {
        ...erc20TokenContract,
        functionName: "allowance",
        args: [
          data.from.address as `0x${string}`,
          typeOfTransaction === FormOptions.INSTANT
            ? BridgeV1.address
            : BridgeQueue.address,
        ],
      },
      {
        ...erc20TokenContract,
        functionName: "decimals",
      },
    ],
    enabled: !bridgingETH,
  });

  const transferAmount = data.to.amount.toNumber();
  const tokenDecimals = (readTokenData?.[1]?.result ?? GWEI_DECIMAL) as number;
  const tokenAllowance = new BigNumber(
    readTokenData?.[0]?.result?.toString() ?? 0,
  );
  const hasEnoughAllowance = tokenAllowance.gte(
    parseUnits(`${transferAmount}`, tokenDecimals).toString(),
  );

  const {
    isBridgeTxnLoading,
    isBridgeTxnCreated,
    refetchBridge,
    writeBridgeToDeFiChain,
    transactionHash,
  } = useWriteBridgeToDeFiChain({
    receiverAddress: data.to.address,
    tokenName: data.from.tokenName as Erc20Token,
    transferAmount,
    tokenDecimals,
    hasEnoughAllowance,
    onBridgeTxnSettled: () => setHasPendingTx(false),
    setEventError,
  });

  const {
    isApproveTxnLoading,
    isApproveTxnSuccess,
    refetchedBridgeFn,
    writeApprove,
  } = useWriteApproveToken({
    tokenName: data.from.tokenName as Erc20Token,
    setErrorMessage,
    refetchBridge,
    refetchTokenData,
  });

  const handleCreateQueueTransaction = async (
    txnHash: string,
    isFirstAttempt: boolean = true,
  ): Promise<void> => {
    const sleepTimeBeforeFirstApiCall = 15000;
    const sleepTimeBeforeRetryApiCall = 10000;
    try {
      await sleep(
        isFirstAttempt
          ? sleepTimeBeforeFirstApiCall
          : sleepTimeBeforeRetryApiCall,
      );
      await queueTransaction({ txnHash }).unwrap();
      // only after queue has been created successfully then we set the form to null
      setQueueStorage("txn-form-queue", null);
      // only after queue has been created successfully then we set that queue has been created successfully
      setQueueStorage("created-queue-txn-hash", txnHash);
      onClose(true);
    } catch (e) {
      if (e.data?.error?.includes("Transaction is still pending")) {
        await handleCreateQueueTransaction(txnHash, false);
      } else {
        setErrorMessage("Unable to create a Queue transaction.");
      }
    }
  };

  // Requires approval for more allowance
  useEffect(() => {
    if (
      !bridgingETH && // ETH doesn't require approval
      (eventError?.customErrorDisplay === "InsufficientAllowanceError" ||
        !hasEnoughAllowance)
    ) {
      setRequiresApproval(true);
    }
  }, [eventError?.customErrorDisplay, hasEnoughAllowance]);

  // Consolidate all the possible status of the txn before its tx hash is created
  useEffect(() => {
    let status = BridgeStatus.NoTxCreated;

    if (
      eventError !== undefined &&
      eventError?.customErrorDisplay !== "InsufficientAllowanceError"
    ) {
      setErrorMessage(eventError.message);
      setHasPendingTx(false);
    } else if ((hasPendingTx && requiresApproval) || isApproveTxnLoading) {
      status = BridgeStatus.IsTokenApprovalInProgress;
    } else if (hasPendingTx) {
      status = BridgeStatus.IsBridgeToDfcInProgress;
    } else if (!hasPendingTx && isBridgeTxnCreated) {
      status = BridgeStatus.QueueingTransaction;
    } else if (isApproveTxnSuccess && requiresApproval) {
      status = BridgeStatus.IsTokenApproved;
    } else if (!isApproveTxnSuccess && requiresApproval) {
      status = BridgeStatus.IsTokenRejected;
    }
    setBridgeStatus(status);
  }, [
    hasPendingTx,
    isApproveTxnLoading,
    isApproveTxnSuccess,
    isBridgeTxnLoading,
    isBridgeTxnCreated,
    requiresApproval,
    transactionHash,
    networkEnv,
    eventError,
  ]);

  useEffect(() => {
    if (transactionHash === undefined) {
      return;
    }

    if (typeOfTransaction === FormOptions.INSTANT) {
      setStorage("unconfirmed", transactionHash);
      setStorage("confirmed", null);
      setStorage("allocationTxnHash", null);
      setStorage("reverted", null);
      setStorage("txn-form", null);
      onClose(true);
    } else {
      setQueueStorage("unconfirmed-queue", transactionHash);
      setQueueStorage("confirmed-queue", null);
      setQueueStorage("allocation-txn-hash-queue", null);
      setQueueStorage("reverted-queue", null);
      setBridgeStatus(BridgeStatus.QueueingTransaction);
      handleCreateQueueTransaction(transactionHash);
    }
  }, [transactionHash]);

  useEffect(() => {
    const successfulApproval = isApproveTxnSuccess && refetchedBridgeFn;

    if (successfulApproval && hasEnoughAllowance) {
      // Automatically trigger `bridgeToDeFiChain` once allowance is approved
      setRequiresApproval(false);
      setHasPendingTx(true);
      setTimeout(() => writeBridgeToDeFiChain?.(), 300);
    } else if (hasEnoughAllowance) {
      setRequiresApproval(false);
    } else if (successfulApproval && !hasEnoughAllowance) {
      writeApprove?.();
    }
  }, [isApproveTxnSuccess, hasEnoughAllowance, refetchedBridgeFn]);

  const handleInitiateTransfer = async () => {
    setErrorMessage(undefined);
    setEventError(undefined);
    setHasPendingTx(true);

    if (!bridgingETH) {
      // Refetch token allowance
      const { data: refetchedData } = await refetchTokenData();
      const latestTokenAllowance = new BigNumber(
        refetchedData?.[0]?.result?.toString() ?? 0,
      );
      const latestTokenDecimals = (refetchedData?.[1]?.result ??
        GWEI_DECIMAL) as number;
      const hasInsufficientAllowance = latestTokenAllowance?.lt(
        parseUnits(`${transferAmount}`, latestTokenDecimals).toString(),
      );
      if (hasInsufficientAllowance) {
        setRequiresApproval(true);
        writeApprove?.();
        return;
      }
    }

    // If no approval required, perform bridge function directly
    writeBridgeToDeFiChain?.();
  };

  const statusMessage = {
    [BridgeStatus.IsTokenApprovalInProgress]: {
      title: "Waiting for approval",
      message: `Requesting permission to access your ${data.from.tokenName} funds.`,
    },
    [BridgeStatus.IsBridgeToDfcInProgress]: {
      title: "Waiting for confirmation",
      message: "Confirm this transaction in your Wallet.",
    },
    [BridgeStatus.QueueingTransaction]: {
      title: "Queueing transaction",
      message:
        "Do not close your browser or hit refresh as the bridge process your transaction queue.",
    },
  };

  let actionButtonMessage = "Add to queue";
  if (typeOfTransaction === FormOptions.INSTANT) {
    actionButtonMessage = isMobile
      ? "Confirm transfer"
      : "Confirm transfer on wallet";
  }

  return (
    <>
      {errorMessage !== undefined && (
        <ErrorModal
          title="Transaction error"
          message={errorMessage}
          primaryButtonLabel={
            transactionHash ? "View on Etherscan" : "Try again"
          }
          onPrimaryButtonClick={() =>
            transactionHash
              ? window.open(`${ExplorerURL}/tx/${transactionHash}`, "_blank")
              : handleInitiateTransfer()
          }
          onClose={() => onClose(false)}
        />
      )}

      {[
        BridgeStatus.IsTokenApprovalInProgress,
        BridgeStatus.IsBridgeToDfcInProgress,
        BridgeStatus.QueueingTransaction,
      ].includes(bridgeStatus) && (
        <Modal isOpen>
          <div className="flex flex-col items-center mt-6 mb-14">
            <div className="w-24 h-24 border border-brand-200 border-b-transparent rounded-full animate-spin" />
            <span className="font-bold text-2xl text-dark-900 mt-12">
              {statusMessage[bridgeStatus].title}
            </span>
            <span className="text-dark-900 mt-2 text-center">
              {statusMessage[bridgeStatus].message}
            </span>
          </div>
        </Modal>
      )}

      <AlertInfoMessage containerStyle="px-5 py-4 mt-14">
        <span className="text-left text-warning text-xs ml-3">
          {DISCLAIMER_MESSAGE}
        </span>
      </AlertInfoMessage>
      <div className={clsx("px-6 py-8", "md:px-[128px] lg:px-[72px] md:pt-16")}>
        <ActionButton
          testId="confirm-transfer-btn"
          label={actionButtonMessage}
          onClick={() => handleInitiateTransfer()}
          disabled={
            hasPendingTx ||
            (requiresApproval === true
              ? writeApprove === undefined
              : writeBridgeToDeFiChain === undefined)
          }
          isLoading={
            requiresApproval === true
              ? writeApprove === undefined
              : writeBridgeToDeFiChain === undefined
          }
        />
      </div>
    </>
  );
}
