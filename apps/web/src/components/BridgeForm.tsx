import clsx from "clsx";
import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { useAccount, useBalance } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { autoUpdate, shift, size, useFloating } from "@floating-ui/react-dom";
import { networks, useNetworkContext } from "@contexts/NetworkContext";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import {
  Network,
  NetworkOptionsI,
  SelectionType,
  TokensI,
  TokenBalances,
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
import { useContractContext } from "@contexts/ContractContext";
import { useStorageContext } from "@contexts/StorageContext";
import { useGetAddressDetailMutation } from "@store/index";
import dayjs from "dayjs";
import useTransferFee from "@hooks/useTransferFee";
import useCheckBalance from "@hooks/useCheckBalance";
import RestoreTransactionModal from "@components/erc-transfer/RestoreTransactionModal";
import debounce from "@utils/debounce";
import InputSelector from "./InputSelector";
import WalletAddressInput from "./WalletAddressInput";
import ConfirmTransferModal from "./ConfirmTransferModal";
import {
  DFC_TO_ERC_RESET_FORM_TIME_LIMIT,
  ETHEREUM_SYMBOL,
  FEES_INFO,
} from "../constants";
import Tooltip from "./commons/Tooltip";

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
            { "pointer-events-none": disabled }
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
}: {
  hasPendingTxn: boolean;
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
  const { dfcAddress, dfcAddressDetails, txnForm, setStorage, txnHash } =
    useStorageContext();

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
    refetch?: boolean
  ): Promise<boolean | undefined> {
    const key = `${selectedNetworkA.name}-${selectedTokensA.tokenB.symbol}`;
    const balance = (refetch ? await getBalanceFn() : tokenBalances)[key];

    if (balance === null) {
      setIsBalanceSufficient(false);
      return false;
    }

    if (balance) {
      const isSufficientBalance = new BigNumber(balance).isGreaterThanOrEqualTo(
        amount !== "" ? amount : 0
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

  const validateAmountInput = (value: string, maxValue: BigNumber) => {
    const isSendingToDFC = selectedNetworkB.name === Network.DeFiChain;
    let err = "";
    if (isSendingToDFC && new BigNumber(value).gt(maxValue.toFixed(8))) {
      err = "Insufficient Funds";
    }
    if (
      isSendingToDFC &&
      new BigNumber(value).lt(
        new BigNumber(1).dividedBy(new BigNumber(10).pow(8))
      )
    ) {
      err = "Invalid Amount";
    }
    setAmountErr(err);

    return err;
  };

  const onInputChange = (value: string): void => {
    const numberOnlyRegex = /^\d*\.?\d*$/; // regex to allow only number
    const maxDpRegex = /^\d*(\.\d{0,5})?$/; // regex to allow only max of 5 dp

    if (
      value === "" ||
      (numberOnlyRegex.test(value) && maxDpRegex.test(value))
    ) {
      setAmount(value);
      validateAmountInput(value, maxAmount);
    }
  };

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
            new BigNumber(refetchedEvmBalance.data?.formatted ?? 0)
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
    setStorage("dfc-address", null);
    setStorage("dfc-address-details", null);
    setHasUnconfirmedTxn(false);
    setAmount("");
    setAddressInput("");
    setFromAddress(address || "");
    setAmountErr("");
    resetNetworkSelection();
    resetNetworkEnv();
  };

  const onRefreshEvmBalance = async () => {
    await refetchEvmBalance();
  };

  const getActionBtnLabel = () => {
    switch (true) {
      case hasPendingTxn:
        return "Pending Transaction";
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
    } else setUtilityModalData(UtilityModalMessage.leaveTransaction);
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
    localDfcAddress: string | undefined
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

  const warningTextStyle =
    "block text-xs text-warning text-center lg:px-6 lg:text-sm";

  return (
    <div className="w-full md:w-[calc(100%+2px)] lg:w-full dark-card-bg-image p-6 md:pt-8 pb-16 lg:p-10 rounded-lg lg:rounded-xl border border-dark-200 backdrop-blur-[18px]">
      <div className="flex flex-row items-center" ref={reference}>
        <div className="w-1/2">
          <InputSelector
            label="Source Network"
            popUpLabel="Select source"
            options={networks}
            floatingObj={floatingObj}
            type={SelectionType.Network}
            onSelect={(value: NetworkOptionsI) => setSelectedNetworkA(value)}
            value={selectedNetworkA}
            disabled={hasUnconfirmedTxn}
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
        <span className="pl-4 text-xs font-semibold text-dark-900 lg:pl-5 lg:text-sm">
          Amount to transfer
        </span>
        <QuickInputCard
          maxValue={maxAmount}
          onChange={onInputChange}
          value={amount}
          error={amountErr}
          showAmountsBtn={selectedNetworkA.name === Network.Ethereum}
          disabled={hasUnconfirmedTxn}
        />
        {isConnected && (
          <div className="flex flex-row pl-3 md:pl-5 lg:pl-6 mt-2 items-center">
            {amountErr ? (
              <span className="text-xs lg:text-sm text-error">{amountErr}</span>
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
          onAddressInputError={(hasError) => setHasAddressInputErr(hasError)}
          disabled={!isConnected}
          readOnly={hasUnconfirmedTxn}
        />
      </div>
      <div className="flex flex-row justify-between items-center px-3 lg:px-5 mt-6 lg:mt-0">
        <div className="flex flex-row items-center">
          <span className="text-dark-700 text-xs lg:text-base font-semibold md:font-normal">
            Fees
          </span>
          <div className="ml-2">
            <IconTooltip title={FEES_INFO.title} content={FEES_INFO.content} />
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
            0
          ).toFixed(6, BigNumber.ROUND_FLOOR)}
          thousandSeparator
          suffix={` ${selectedTokensB.tokenA.name}`}
          trimTrailingZeros
        />
      </div>
      <div className="mt-8 px-6 md:px-4 lg:mt-12 lg:mb-0 lg:px-0 xl:px-20">
        <ConnectKitButton.Custom>
          {({ show }) => (
            <ActionButton
              testId="transfer-btn"
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

        {hasPendingTxn && (
          <span className={clsx("pt-2", warningTextStyle)}>
            Unable to edit while transaction is pending
          </span>
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
          <div className={clsx("pt-3", warningTextStyle)}>
            Unable to process transaction. <div>Please try again later</div>
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
      {showErcToDfcRestoreModal && (
        <RestoreTransactionModal
          title="Recover transaction"
          message="Enter your Ethereum transaction ID to load your transaction again for review"
          onClose={() => setShowErcToDfcRestoreModal(false)}
        />
      )}
    </div>
  );
}
