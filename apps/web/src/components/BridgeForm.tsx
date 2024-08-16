import clsx from "clsx";
import BigNumber from "bignumber.js";
import { useEffect, useState, Dispatch, SetStateAction } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { useAccount, useBalance } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { autoUpdate, shift, size, useFloating } from "@floating-ui/react-dom";
import {
  networks,
  useNetworkContext,
  FormOptions,
} from "@contexts/NetworkContext";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import {
  Network,
  NetworkOptionsI,
  SelectionType,
  TokenBalances,
  TokensI,
} from "types";
import SwitchIcon from "@components/icons/SwitchIcon";
import UtilityModal, {
  ModalConfigType,
} from "@components/commons/UtilityModal";
import ArrowDownIcon from "@components/icons/ArrowDownIcon";
import ActionButton from "@components/commons/ActionButton";
import IconTooltip from "@components/commons/IconTooltip";
import NumericFormat from "@components/commons/NumericFormat";
import { QuickInputCard } from "@components/commons/QuickInputCard";
import TransactionStatus from "@components/TransactionStatus";
import { useContractContext } from "@contexts/ContractContext";
import { useStorageContext } from "@contexts/StorageContext";
import { useGetAddressDetailMutation } from "@store/index";
import dayjs from "dayjs";
import useWatchEthTxn from "@hooks/useWatchEthTxn";
import useTransferFee from "@hooks/useTransferFee";
import useCheckBalance from "@hooks/useCheckBalance";
import debounce from "@utils/debounce";
import InputSelector from "./InputSelector";
import WalletAddressInput from "./WalletAddressInput";
import ConfirmTransferModal from "./ConfirmTransferModal";
import {
  DFC_TO_ERC_RESET_FORM_TIME_LIMIT,
  ETHEREUM_SYMBOL,
  FEES_INFO,
  CONFIRMATIONS_BLOCK_TOTAL,
  EVM_CONFIRMATIONS_BLOCK_TOTAL,
  DFC_CONFIRMATIONS_BLOCK_TOTAL,
} from "../constants";
import Tooltip from "./commons/Tooltip";
import QueryTransactionModal, {
  QueryTransactionModalType,
} from "./erc-transfer/QueryTransactionModal";
import useInputValidation from "../hooks/useInputValidation";

function SwitchButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="my-4 flex flex-row rounded">
      <div className="mt-5 flex w-full flex-1 justify-between border-t border-dark-300 border-opacity-50" />
      <Tooltip content="Switch source" containerClass="py-0">
        <button
          title="switch-source-button"
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={clsx(
            "dark-card-bg dark-bg-card-section group flex h-10 w-10 items-center justify-center rounded-full",
            { "pointer-events-none": disabled },
          )}
        >
          <div className="hidden group-hover:hidden lg:block">
            <ArrowDownIcon size={20} className="fill-dark-700" />
          </div>
          <div className="group-hover:block lg:hidden">
            <SwitchIcon size={20} className="fill-dark-700" />
          </div>
        </button>
      </Tooltip>
      <div className="mt-5 flex w-full flex-1 justify-between border-t border-dark-300 border-opacity-50" />
    </div>
  );
}

export default function BridgeForm({
  hasPendingTxn,
  activeTab,
  setActiveTab,
}: {
  hasPendingTxn: boolean;
  activeTab: FormOptions;
  setActiveTab: Dispatch<SetStateAction<FormOptions>>;
}) {
  const {
    selectedNetworkA,
    selectedTokensA,
    selectedNetworkB,
    selectedTokensB,
    setSelectedNetworkA,
    setSelectedTokensA,
    setSelectedNetworkB,
    setSelectedTokensB,
    resetNetworkSelection,
  } = useNetworkContext();

  const { networkEnv, updateNetworkEnv, resetNetworkEnv } =
    useNetworkEnvironmentContext();
  const { Erc20Tokens } = useContractContext();
  const {
    dfcAddress,
    dfcAddressDetails,
    destinationAddress,
    txnForm,
    transferAmount,
    transferDisplaySymbolA,
    transferDisplaySymbolB,
    setStorage,
    txnHash,
  } = useStorageContext();

  const [amount, setAmount] = useState<string>("");
  const [amountErr, setAmountErr] = useState<string>("");
  const [addressInput, setAddressInput] = useState<string>("");
  const [hasAddressInputErr, setHasAddressInputErr] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showErcToDfcRestoreModal, setShowErcToDfcRestoreModal] =
    useState<boolean>(false);

  const [utilityModalData, setUtilityModalData] =
    useState<ModalConfigType | null>(null);

  const [fee, feeSymbol] = useTransferFee(amount);

  const { ethTxnStatus, dfcTxnStatus, isApiSuccess } = useWatchEthTxn();
  const { address, isConnected } = useAccount();
  const isSendingFromEthNetwork = selectedNetworkA.name === Network.Ethereum;
  const {
    data: evmBalance,
    refetch: refetchEvmBalance,
    isFetching: isEvmBalanceFetching,
  } = useBalance({
    address,
    enabled: isSendingFromEthNetwork,
    watch: false,
    ...(isSendingFromEthNetwork &&
      selectedTokensA.tokenA.name !== ETHEREUM_SYMBOL && {
        token: Erc20Tokens[selectedTokensA.tokenA.name].address,
      }),
  });

  const maxAmount = new BigNumber(evmBalance?.formatted ?? 0);
  const [fromAddress, setFromAddress] = useState<string>(address || "");
  const [hasUnconfirmedTxn, setHasUnconfirmedTxn] = useState(false);

  const [getAddressDetail] = useGetAddressDetailMutation();

  const { getBalance } = useCheckBalance();
  const [isBalanceSufficient, setIsBalanceSufficient] = useState(true);
  const [tokenBalances, setTokenBalances] = useState<TokenBalances | {}>({});
  const [isVerifyingTransaction, setIsVerifyingTransaction] = useState(false);
  async function getBalanceFn(): Promise<TokenBalances | {}> {
    const key = `${selectedNetworkA.name}-${selectedTokensA.tokenB.symbol}`;
    const balance = await getBalance(selectedTokensA.tokenB.symbol);
    const updatedBalances = {
      ...tokenBalances,
      [key]: balance,
    };

    setTokenBalances(updatedBalances);
    return updatedBalances;
  }

  const checkBalance = debounce(async () => {
    await getBalanceFn();
  }, 200);

  async function verifySufficientHWBalance(
    refetch?: boolean,
  ): Promise<boolean | undefined> {
    const key = `${selectedNetworkA.name}-${selectedTokensA.tokenB.symbol}`;
    const balance = (refetch ? await getBalanceFn() : tokenBalances)[key];

    if (balance === null || new BigNumber(balance).lte(0)) {
      setIsBalanceSufficient(false);
      return false;
    }

    if (balance) {
      const isSufficientBalance = new BigNumber(balance).isGreaterThanOrEqualTo(
        amount !== "" ? amount : 0,
      );

      setIsBalanceSufficient(isSufficientBalance);
      return isSufficientBalance;
    }

    return undefined;
  }

  useEffect(() => {
    verifySufficientHWBalance();
  }, [selectedNetworkA, selectedTokensA, networkEnv, tokenBalances, amount]);

  useEffect(() => {
    checkBalance();
  }, [selectedNetworkA, selectedTokensA, networkEnv]);

  const isFormValid =
    amount && new BigNumber(amount).gt(0) && !amountErr && !hasAddressInputErr;

  const switchNetwork = () => {
    setSelectedNetworkA(selectedNetworkB);
  };

  const { onInputChange, validateAmountInput } = useInputValidation(
    setAmount,
    maxAmount,
    selectedNetworkB,
    setAmountErr,
  );

  const onTransferTokens = async (): Promise<void> => {
    setIsVerifyingTransaction(true);
    const isBalanceSufficientVerified = await verifySufficientHWBalance(true);
    if (isBalanceSufficientVerified) {
      if (isSendingFromEthNetwork) {
        // Revalidate entered amount after refetching EVM balance
        const refetchedEvmBalance = await refetchEvmBalance();
        if (
          validateAmountInput(
            amount,
            new BigNumber(refetchedEvmBalance.data?.formatted ?? 0),
          )
        ) {
          setIsVerifyingTransaction(false);
          return;
        }
      }
      if (!hasUnconfirmedTxn) {
        const newTxn = {
          selectedNetworkA,
          selectedTokensA,
          selectedNetworkB,
          selectedTokensB,
          networkEnv,
          amount,
          fromAddress,
          toAddress: addressInput,
        };
        setStorage("txn-form", JSON.stringify(newTxn));
      }
      setShowConfirmModal(true);
    }
    setIsVerifyingTransaction(false);
  };

  const onResetTransferForm = () => {
    setUtilityModalData(null);
    setStorage("txn-form", null);
    setStorage("destination-address", null);
    setStorage("dfc-address", null);
    setStorage("dfc-address-details", null);
    setStorage("transfer-amount", null);
    setHasUnconfirmedTxn(false);
    setAmount("");
    setAddressInput("");
    setFromAddress(address || "");
    setAmountErr("");
    resetNetworkSelection();
    resetNetworkEnv();
  };

  const onDone = () => {
    setStorage("confirmed", null);
    setStorage("allocationTxnHash", null);
    setStorage("reverted", null);
    onResetTransferForm();
  };

  const onRefreshEvmBalance = async () => {
    await refetchEvmBalance();
  };

  const getActionBtnLabel = () => {
    switch (true) {
      case hasPendingTxn:
        return "Awaiting confirmation";
      case hasUnconfirmedTxn:
        return "Retry transfer";
      case isConnected:
        return "Review transaction";
      default:
        return "Connect wallet";
    }
  };

  const UtilityModalMessage = {
    resetForm: {
      title: "Are you sure you want to reset form?",
      message:
        "Resetting it will lose any pending transaction and funds related to it. This is irrecoverable, proceed with caution",
      primaryButtonLabel: "Reset form",
      onPrimaryButtonClick: () => onResetTransferForm(),
      secondaryButtonLabel: "Go back",
      onSecondaryButtonClick: () => setUtilityModalData(null),
    },
    leaveTransaction: {
      title: "Are you sure you want to leave your transaction?",
      message:
        "You may lose any pending transaction and funds related to it. This is irrecoverable, proceed with caution",
      primaryButtonLabel: "Leave transaction",
      onPrimaryButtonClick: () => {
        setShowConfirmModal(false);
        setUtilityModalData(null);
      },
      secondaryButtonLabel: "Go back",
      onSecondaryButtonClick: () => setUtilityModalData(null),
    },
  };

  async function confirmationModalonClose(noCloseWarning: boolean) {
    if (noCloseWarning) {
      if (isSendingFromEthNetwork) {
        // Wait 15 seconds to give some time for txn to be confirmed
        setTimeout(async () => {
          await refetchEvmBalance();
        }, 15000);
      }

      setShowConfirmModal(false);
    } else {
      setUtilityModalData(UtilityModalMessage.leaveTransaction);
    }
  }

  useEffect(() => {
    if (amount) {
      // Revalidate entered amount when selected token is changed
      validateAmountInput(amount, maxAmount);
    }
  }, [maxAmount]);

  useEffect(() => {
    const localData = txnForm;

    if (localData && networkEnv === localData.networkEnv) {
      setStorage("destination-address", localData.toAddress);
      setStorage("transfer-amount", localData.amount);
      setStorage(
        "transfer-display-symbol-A",
        localData.selectedTokensA.tokenA.name,
      );
      setStorage(
        "transfer-display-symbol-B",
        localData.selectedTokensB.tokenA.name,
      );
      // Load data from storage
      setHasUnconfirmedTxn(true);
      setAmount(localData.amount);
      setAddressInput(localData.toAddress);
      setFromAddress(localData.fromAddress ?? address);
      setSelectedNetworkA(localData.selectedNetworkA);
      setSelectedTokensA(localData.selectedTokensA);
      setSelectedNetworkB(localData.selectedNetworkB);
      setSelectedTokensB(localData.selectedTokensB);
      updateNetworkEnv(localData.networkEnv);
    } else {
      setHasUnconfirmedTxn(false);
      setFromAddress(address as string);
    }
  }, [networkEnv, txnForm]);

  const fetchAddressDetail = async (
    localDfcAddress: string | undefined,
  ): Promise<void> => {
    try {
      if (localDfcAddress) {
        const addressDetailRes = await getAddressDetail({
          address: localDfcAddress,
        }).unwrap();
        const diff = dayjs().diff(dayjs(addressDetailRes?.createdAt));
        if (diff > DFC_TO_ERC_RESET_FORM_TIME_LIMIT) {
          setStorage("txn-form", null);
          setStorage("dfc-address", null);
        } else {
          // TODO: Improve setStorage by not forcing stringified JSON
          setStorage("dfc-address-details", JSON.stringify(addressDetailRes));
        }
      } else {
        setStorage("dfc-address-details", null);
      }
    } catch {
      setStorage("dfc-address-details", null);
    }
  };

  useEffect(() => {
    fetchAddressDetail(dfcAddress);
  }, [networkEnv, dfcAddress]);

  const { y, reference, floating, strategy, refs } = useFloating({
    placement: "bottom-end",
    middleware: [
      shift(),
      size({
        apply({ rects }) {
          if (
            refs.floating.current !== null &&
            refs.floating.current !== undefined
          ) {
            Object.assign(refs.floating.current.style, {
              minWidth: "225px",
              maxWidth: "368px",
              width: `${rects.reference.width}px`,
            });
          }
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const floatingObj = {
    strategy,
    y,
    floating,
  };

  const getNumberOfConfirmations = () => {
    let numOfConfirmations = BigNumber.min(
      ethTxnStatus?.numberOfConfirmations,
      EVM_CONFIRMATIONS_BLOCK_TOTAL,
    ).toString();

    if (txnHash.confirmed !== undefined || txnHash.unsentFund !== undefined) {
      numOfConfirmations = CONFIRMATIONS_BLOCK_TOTAL.toString();
    } else if (txnHash.reverted !== undefined) {
      numOfConfirmations = "0";
    }

    return numOfConfirmations;
  };

  return (
    <div
      className={clsx(
        "w-full md:w-[calc(100%+2px)] lg:w-full p-6 pb-10 pt-8 lg:pt-6 lg:p-10",
        "dark-card-bg-image backdrop-blur-[18px]",
        "border border-dark-200 border-t-0 rounded-b-lg lg:rounded-b-xl",
        activeTab === FormOptions.INSTANT ? "block" : "hidden",
      )}
    >
      {txnHash.unconfirmed ||
      txnHash.confirmed ||
      txnHash.reverted ||
      txnHash.unsentFund ? (
        <>
          <TransactionStatus
            txnHash={
              txnHash.unsentFund ??
              txnHash.reverted ??
              txnHash.confirmed ??
              txnHash.unconfirmed
            }
            allocationTxnHash={txnHash.allocationTxn}
            isReverted={txnHash.reverted !== undefined}
            isConfirmed={txnHash.confirmed !== undefined} // isConfirmed on both EVM and DFC
            isUnsentFund={txnHash.unsentFund !== undefined}
            ethTxnStatusIsConfirmed={ethTxnStatus.isConfirmed}
            dfcTxnStatusIsConfirmed={dfcTxnStatus.isConfirmed}
            numberOfEvmConfirmations={
              txnHash.confirmed !== undefined
                ? EVM_CONFIRMATIONS_BLOCK_TOTAL.toString()
                : getNumberOfConfirmations()
            }
            numberOfDfcConfirmations={
              txnHash.confirmed !== undefined
                ? DFC_CONFIRMATIONS_BLOCK_TOTAL.toString()
                : dfcTxnStatus.numberOfConfirmations
            }
            isApiSuccess={isApiSuccess || txnHash.reverted !== undefined}
          />
          <div className="flex flex-col space-y-7">
            <div className="flex flex-row justify-between">
              <div className="flex flex-row">
                <span className="text-dark-700 text-sm lg:text-base lg:leading-5">
                  Amount to transfer
                </span>
              </div>
              <NumericFormat
                className="block break-words text-right text-dark-1000 text-sm leading-5 lg:text-base"
                value={BigNumber.max(
                  new BigNumber(transferAmount || amount || 0).minus(fee),
                  0,
                ).toFixed(6, BigNumber.ROUND_FLOOR)}
                thousandSeparator
                suffix={` ${transferDisplaySymbolA}`}
                trimTrailingZeros
              />
            </div>
            <div className="flex flex-row justify-between">
              <div className="flex flex-row">
                <span className="text-dark-700 text-sm lg:text-base lg:leading-5">
                  Destination address
                </span>
              </div>
              <span className="max-w-[50%] block break-words text-right text-dark-1000 text-sm leading-5 lg:text-base">
                {destinationAddress || addressInput}
              </span>
            </div>
            <div className="flex flex-row justify-between">
              <div className="flex flex-row items-center">
                <span className="text-dark-700 text-sm lg:text-base lg:leading-5">
                  Fees
                </span>
                <div className="ml-2">
                  <IconTooltip
                    title={FEES_INFO.title}
                    content={FEES_INFO.content}
                  />
                </div>
              </div>
              <NumericFormat
                className="block break-words text-right text-sm text-dark-1000 leading-5 lg:text-base"
                value={fee}
                thousandSeparator
                suffix={` ${transferDisplaySymbolA}`}
                trimTrailingZeros
              />
            </div>
            <div className="flex flex-row justify-between">
              <div className="flex flex-row">
                <span className="text-dark-700 text-sm lg:text-base lg:leading-5">
                  To receive
                </span>
              </div>
              <NumericFormat
                className="block break-words text-right text-dark-1000 text-sm leading-5 lg:text-base"
                value={BigNumber.max(
                  new BigNumber(transferAmount || amount || 0).minus(fee),
                  0,
                ).toFixed(6, BigNumber.ROUND_FLOOR)}
                thousandSeparator
                suffix={` ${transferDisplaySymbolB}`}
                trimTrailingZeros
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="flex flex-col lg:px-5 px-3 gap-y-1">
            <span className="text-dark-900 lg:font-bold font-semibold lg:text-xl text-[16px] leading-5">
              Bridge your tokens instantly
            </span>
            <span className="lg:text-[16px] lg:leading-5 text-sm text-dark-700">
              For transactions within active liquidity.
            </span>
          </section>

          <div
            className="flex flex-row items-center lg:mt-10 md:mt-8 mt-6"
            ref={reference}
          >
            <div className="w-1/2">
              <InputSelector
                label="Source Network"
                popUpLabel="Select source"
                options={networks}
                floatingObj={floatingObj}
                type={SelectionType.Network}
                onSelect={(value: NetworkOptionsI) =>
                  setSelectedNetworkA(value)
                }
                value={selectedNetworkA}
                disabled
              />
            </div>
            <div className="w-1/2">
              <InputSelector
                label="Token"
                popUpLabel="Select token"
                options={selectedNetworkA.tokens}
                floatingObj={floatingObj}
                type={SelectionType.Token}
                onSelect={(value: TokensI) => setSelectedTokensA(value)}
                value={selectedTokensA}
                disabled={hasUnconfirmedTxn}
              />
            </div>
          </div>
          <div className="mt-4">
            <span className="pl-3 text-xs font-semibold text-dark-900 lg:pl-5 lg:text-sm">
              Amount to transfer
            </span>
            <QuickInputCard
              maxValue={maxAmount}
              onChange={onInputChange}
              value={amount}
              error={amountErr}
              showAmountsBtn={selectedNetworkA.name === Network.Ethereum}
              disabled={hasUnconfirmedTxn}
              testId="instant-amount-input"
            />
            {isConnected && (
              <div className="flex flex-row pl-3 md:pl-5 lg:pl-6 mt-2 items-center">
                {amountErr ? (
                  <span className="text-xs lg:text-sm text-error">
                    {amountErr}
                  </span>
                ) : (
                  selectedNetworkA.name === Network.Ethereum && (
                    <>
                      <span className="text-xs lg:text-sm text-dark-700">
                        Available:
                      </span>
                      <NumericFormat
                        className="text-xs lg:text-sm text-dark-900 ml-1"
                        value={maxAmount.toFixed(5, BigNumber.ROUND_FLOOR)}
                        decimalScale={5}
                        thousandSeparator
                        suffix={` ${selectedTokensA.tokenA.name}`}
                      />
                      <FiRefreshCw
                        onClick={onRefreshEvmBalance}
                        size={12}
                        className={clsx("text-dark-900 ml-2 cursor-pointer", {
                          "animate-spin": isEvmBalanceFetching,
                        })}
                      />
                    </>
                  )
                )}
              </div>
            )}
          </div>
          <SwitchButton onClick={switchNetwork} disabled={hasUnconfirmedTxn} />

          <div className="flex flex-row items-end mb-4">
            <div className="w-1/2">
              <InputSelector
                label="Destination Network"
                disabled
                popUpLabel="Select destination"
                floatingObj={floatingObj}
                type={SelectionType.Network}
                value={selectedNetworkB}
              />
            </div>
            <div className="w-1/2">
              <InputSelector
                disabled
                label="Token to Receive"
                popUpLabel="Select token"
                floatingObj={floatingObj}
                type={SelectionType.Token}
                value={selectedTokensB}
              />
            </div>
          </div>
          <div className="mb-6">
            <WalletAddressInput
              label="Address"
              blockchain={selectedNetworkB.name as Network}
              addressInput={addressInput}
              onAddressInputChange={(addrInput) => setAddressInput(addrInput)}
              onAddressInputError={(hasError) =>
                setHasAddressInputErr(hasError)
              }
              disabled={!isConnected}
              readOnly={hasUnconfirmedTxn}
              testId="instant-receiver-address"
            />
          </div>
          <div className="flex flex-row justify-between items-center px-3 lg:px-5 mt-6 lg:mt-0">
            <div className="flex flex-row items-center">
              <span className="text-dark-700 text-xs lg:text-base font-semibold md:font-normal">
                Fees
              </span>
              <div className="ml-2">
                <IconTooltip
                  title={FEES_INFO.title}
                  content={FEES_INFO.content}
                />
              </div>
            </div>
            <NumericFormat
              className="max-w-[70%] block break-words text-right text-xs text-dark-1000 lg:text-base"
              value={fee}
              thousandSeparator
              suffix={` ${feeSymbol}`}
              trimTrailingZeros
            />
          </div>
          <div className="flex flex-row justify-between items-center px-3 lg:px-5 mt-4 lg:mt-[18px]">
            <span className="text-dark-700 text-xs lg:text-base font-semibold md:font-normal">
              To receive
            </span>
            <NumericFormat
              className="max-w-[70%] block break-words text-right text-dark-1000 text-sm leading-5 lg:text-lg lg:leading-6 font-bold"
              value={BigNumber.max(
                new BigNumber(amount || 0).minus(fee),
                0,
              ).toFixed(6, BigNumber.ROUND_FLOOR)}
              thousandSeparator
              suffix={` ${selectedTokensB.tokenA.name}`}
              trimTrailingZeros
            />
          </div>
        </>
      )}
      <div className="mt-[50px] mx-auto w-[290px] lg:w-[344px]">
        {txnHash.confirmed !== undefined || txnHash.reverted !== undefined ? (
          <>
            <ActionButton
              label="Done"
              onClick={() => onDone()}
              customStyle="mt-6"
            />
            <span
              className={clsx(
                "flex pt-3 text-xs text-center text-dark-700 lg:text-sm",
              )}
            >
              Transaction details will be cleared upon exiting this window. Do
              save them for reference if needed.
            </span>
          </>
        ) : (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <ActionButton
                testId="instant-transfer-btn"
                label={getActionBtnLabel()}
                isLoading={hasPendingTxn || isVerifyingTransaction}
                disabled={
                  (isConnected && !isFormValid) ||
                  hasPendingTxn ||
                  !isBalanceSufficient
                }
                onClick={!isConnected ? show : () => onTransferTokens()}
              />
            )}
          </ConnectKitButton.Custom>
        )}
        {isConnected &&
          selectedNetworkA.name === Network.Ethereum &&
          !amount &&
          !addressInput &&
          !hasPendingTxn &&
          !txnHash.confirmed && (
            <div className="text-xs lg:text-sm leading-4 lg:leading-5 text-dark-700 text-center mt-4">
              Transaction interrupted?
              <button
                type="button"
                className="text-dark-1000 font-bold ml-1"
                onClick={() => setShowErcToDfcRestoreModal(true)}
              >
                Recover it here
              </button>
            </div>
          )}

        {hasUnconfirmedTxn && !hasPendingTxn && (
          <div className="mt-3">
            <ActionButton
              label="Reset form"
              onClick={() => {
                setUtilityModalData(UtilityModalMessage.resetForm);
              }}
              variant="secondary"
            />
          </div>
        )}

        {!isBalanceSufficient && !hasPendingTxn && (
          <div className={clsx("lg:pt-5 pt-4 text-center lg:text-sm text-xs")}>
            <span className="text-dark-700">
              Amount entered exceeds active liquidity. Use&nbsp;
            </span>
            <button
              className="text-dark-1000 font-semibold"
              onClick={() => setActiveTab(FormOptions.QUEUE)}
              type="button"
            >
              Queue
            </button>
            <span className="text-dark-700">
              &nbsp;or lower the transaction amount.
            </span>
          </div>
        )}
      </div>
      <ConfirmTransferModal
        show={showConfirmModal}
        addressDetail={dfcAddressDetails}
        onClose={(noCloseWarning) => {
          confirmationModalonClose(noCloseWarning);
        }}
        amount={amount}
        fromAddress={fromAddress}
        toAddress={addressInput}
      />
      {utilityModalData && (
        <UtilityModal
          title={utilityModalData.title}
          message={utilityModalData.message}
          primaryButtonLabel={utilityModalData.primaryButtonLabel}
          onPrimaryButtonClick={utilityModalData.onPrimaryButtonClick}
          secondaryButtonLabel={utilityModalData.secondaryButtonLabel}
          onSecondaryButtonClick={utilityModalData.onSecondaryButtonClick}
        />
      )}

      <QueryTransactionModal
        title="Recover transaction"
        message="Enter your Ethereum transaction hash to load your transaction again for review"
        inputLabel="Transaction hash"
        inputPlaceholder="Enter transaction hash"
        buttonLabel="Restore transaction"
        onClose={() => setShowErcToDfcRestoreModal(false)}
        isOpen={showErcToDfcRestoreModal}
        type={QueryTransactionModalType.RecoverInstantTransaction}
      />
    </div>
  );
}
