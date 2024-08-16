import clsx from "clsx";
import BigNumber from "bignumber.js";
import Image from "next/image";
import { AddressDetails, Network, RowDataI, TransferData } from "types";
import { useNetworkContext, FormOptions } from "@contexts/NetworkContext";
import useDisableEscapeKey from "@hooks/useDisableEscapeKey";
import useTransferFee from "@hooks/useTransferFee";
import IconTooltip from "@components/commons/IconTooltip";
import Modal from "@components/commons/Modal";
import NumericFormat from "@components/commons/NumericFormat";
import DeFiChainToERC20Transfer from "@components/erc-transfer/DeFiChainToERC20Transfer";
import EvmToDeFiChainTransfer from "@components/erc-transfer/EvmToDeFiChainTransfer";
import { FEES_INFO, PROCESSING_TIME_INFO } from "../constants";

function RowData({
  data,
  label,
  networkLabel,
  isSendingToDFC = true,
}: {
  data: RowDataI;
  label: string;
  networkLabel: string;
  isSendingToDFC?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-row items-center gap-2">
        <span className="text-sm font-semibold tracking-wide text-dark-500">
          {label}
        </span>
        <Image
          width={100}
          height={100}
          src={data.networkIcon}
          alt={data.networkName}
          className={clsx("block w-7 h-7", "md:hidden md:w-9 md:h-9")}
        />
        <hr className="w-full border-dark-200" />
      </div>
      <div className={clsx("flex gap-4 py-6", "md:gap-2 md:py-4")}>
        <Image
          width={100}
          height={100}
          src={data.networkIcon}
          alt={data.networkName}
          className={clsx(
            "hidden w-7 h-7 ml-2",
            "md:block md:w-9 md:h-9 md:ml-0",
          )}
        />
        <div className={clsx("flex flex-col w-1/2", "md:grow md:w-auto")}>
          <span
            className={clsx(
              "text-sm text-dark-900 !leading-5 break-all",
              "md:text-base md:w-5/6",
            )}
          >
            {data.address}
          </span>
          <span
            className={clsx("text-xs text-dark-700 mt-1", "md:text-sm md:mt-0")}
          >
            {networkLabel} {isSendingToDFC ? `(${data.networkName})` : ""}
          </span>
        </div>
        <div
          className={clsx(
            "flex flex-col self-center w-1/2",
            "md:self-end md:w-auto",
          )}
        >
          <NumericFormat
            className={clsx(
              "!text-xl font-bold leading-6 text-right",
              "md:text-lg md:font-semibold",
              data.amount.isPositive() ? "text-valid" : "text-error",
            )}
            value={data.amount.toFixed(6, BigNumber.ROUND_FLOOR)}
            thousandSeparator
            trimTrailingZeros
          />
          <div className="flex items-center justify-end gap-1">
            <Image
              width={100}
              height={100}
              src={data.tokenIcon}
              alt={data.tokenName}
              className={clsx(
                "w-5 h-5 order-last",
                "md:w-4 md:h-4 md:order-none",
              )}
            />
            <span className="text-sm text-dark-700 mt-0.5 md:mt-0">
              {data.tokenName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmTransferModal({
  show,
  onClose,
  amount,
  fromAddress,
  toAddress,
  addressDetail,
}: {
  show: boolean;
  onClose: (noCloseWarning: boolean) => void;
  amount: string;
  fromAddress: string;
  toAddress: string;
  addressDetail?: AddressDetails;
}) {
  const {
    selectedNetworkA,
    selectedTokensA,
    selectedNetworkB,
    selectedTokensB,
    selectedQueueNetworkA,
    selectedQueueTokensA,
    selectedQueueNetworkB,
    selectedQueueTokensB,
    typeOfTransaction,
  } = useNetworkContext();
  useDisableEscapeKey(show);

  const [fee, feeSymbol] = useTransferFee(amount);
  let formSelectedNetworkA;
  let formSelectedNetworkB;
  let formSelectedTokensA;
  let formSelectedTokensB;

  if (typeOfTransaction === FormOptions.INSTANT) {
    formSelectedNetworkA = selectedNetworkA;
    formSelectedNetworkB = selectedNetworkB;
    formSelectedTokensA = selectedTokensA;
    formSelectedTokensB = selectedTokensB;
  } else {
    formSelectedNetworkA = selectedQueueNetworkA;
    formSelectedNetworkB = selectedQueueNetworkB;
    formSelectedTokensA = selectedQueueTokensA;
    formSelectedTokensB = selectedQueueTokensB;
  }

  // Direction of transfer
  const isSendingToDFC = formSelectedNetworkB.name === Network.DeFiChain;

  const data: TransferData = {
    from: {
      address: (isSendingToDFC ? fromAddress : "DeFiChain address") as string,
      networkName: Network[formSelectedNetworkA.name],
      networkIcon: formSelectedNetworkA.icon,
      tokenName: formSelectedTokensA.tokenA.name,
      tokenSymbol: formSelectedTokensA.tokenA.symbol,
      tokenIcon: formSelectedTokensA.tokenA.icon,
      amount: new BigNumber(amount).negated(),
    },
    to: {
      address: toAddress,
      networkName: Network[formSelectedNetworkB.name],
      networkIcon: formSelectedNetworkB.icon,
      tokenName: formSelectedTokensB.tokenA.name,
      tokenSymbol: formSelectedTokensB.tokenA.symbol,
      tokenIcon: formSelectedTokensB.tokenA.icon,
      amount: new BigNumber(amount),
    },
  };

  return (
    <Modal
      title={
        typeOfTransaction === FormOptions.INSTANT
          ? "Review transaction"
          : "Review queue transaction"
      }
      isOpen={show}
      onClose={() => onClose(false)}
      subtitle={
        typeOfTransaction === FormOptions.QUEUE
          ? "Transaction will be sent to queue."
          : undefined
      }
    >
      <RowData
        data={data.from}
        label="FROM"
        networkLabel="Source"
        isSendingToDFC={isSendingToDFC}
      />
      <RowData
        data={{
          ...data.to,
          amount: BigNumber.max(new BigNumber(data.to.amount).minus(fee), 0),
        }}
        label="TO"
        networkLabel="Destination"
      />
      <div className="w-full border-t border-t-dark-200 md:mt-3" />

      {/* Processing time */}
      {typeOfTransaction === FormOptions.QUEUE && (
        <div className="flex justify-between mt-6 md:mt-5 py-2">
          <div className="inline-flex items-center">
            <span className="text-dark-700 text-sm md:text-base">
              Processing time
            </span>
            <div className="ml-2">
              <IconTooltip
                title={PROCESSING_TIME_INFO.title}
                content={PROCESSING_TIME_INFO.content}
                position="top"
              />
            </div>
          </div>
          <div className="text-right text-dark-900 tracking-[0.01em] md:tracking-normal">
            up to 72 hours
          </div>
        </div>
      )}

      {/* Fees */}
      <div className="flex justify-between mt-6 md:mt-5 py-2">
        <div className="inline-flex items-center">
          <span className="text-dark-700 text-sm md:text-base">Fees</span>
          <div className="ml-2">
            <IconTooltip
              title={FEES_INFO.title}
              content={FEES_INFO.content}
              position="top"
            />
          </div>
        </div>
        <NumericFormat
          className="text-right text-dark-900 tracking-[0.01em] md:tracking-normal"
          value={fee}
          thousandSeparator
          suffix={` ${feeSymbol}`}
          trimTrailingZeros
        />
      </div>

      {isSendingToDFC ? (
        <EvmToDeFiChainTransfer
          data={data}
          onClose={(noCloseWarning) => onClose(noCloseWarning)}
        />
      ) : (
        <DeFiChainToERC20Transfer
          data={data}
          addressDetail={addressDetail}
          onClose={(noCloseWarning) => onClose(noCloseWarning)}
        />
      )}
    </Modal>
  );
}
