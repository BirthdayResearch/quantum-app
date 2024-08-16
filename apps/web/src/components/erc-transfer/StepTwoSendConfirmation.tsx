import clsx from "clsx";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { FiAlertCircle, FiLoader } from "react-icons/fi";
import UtilityButton from "@components/commons/UtilityButton";
import { useGenerateAddressMutation } from "@store/index";
import { HttpStatusCode } from "axios";
import { AddressDetails } from "types";
import dayjs from "dayjs";
import AddressError from "@components/commons/AddressError";
import { useStorageContext } from "@contexts/StorageContext";
import BigNumber from "bignumber.js";
import AlertInfoMessage from "@components/commons/AlertInfoMessage";
import debounce from "@utils/debounce";
import { DFC_TO_ERC_RESET_FORM_TIME_LIMIT } from "../../constants";
import QrAddress from "../QrAddress";
import TimeLimitCounter from "./TimeLimitCounter";

function getTimeDifference(createdAt?: Date): number {
  if (createdAt) {
    return dayjs(createdAt)
      .add(DFC_TO_ERC_RESET_FORM_TIME_LIMIT, "millisecond")
      .diff(dayjs());
  }
  return 0;
}

function VerifyButton({
  onVerify,
  disabled = false,
}: {
  onVerify: () => void;
  disabled?: boolean;
}) {
  return (
    <UtilityButton
      label="Verify transfer"
      onClick={onVerify}
      disabled={disabled}
      withArrowIcon
    />
  );
}

function WarningMessage(): JSX.Element {
  return (
    <span className="text-left text-warning ml-3">
      {`Press verify transfer only after your funds have been sent over to the
      address. Make sure to send the `}
      <span className="font-bold">exact amount</span>
      {` or the transaction will
      fail.`}
    </span>
  );
}

export default function StepTwoSendConfirmation({
  goToNextStep,
  refundAddress,
  addressDetail,
  sourceDetail,
  destinationDetail,
}: {
  goToNextStep: () => void;
  refundAddress: string;
  addressDetail?: AddressDetails;
  sourceDetail: {
    tokenIcon: string;
    tokenName: string;
  };
  destinationDetail: {
    amount: BigNumber;
  };
}) {
  const [dfcUniqueAddress, setDfcUniqueAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddressExpired, setIsAddressExpired] = useState(false);
  const [createdBeforeInMSec, setCreatedBeforeInMSec] = useState(
    getTimeDifference(addressDetail?.createdAt),
  );
  const [addressGenerationError, setAddressGenerationError] = useState("");
  const [generateAddress] = useGenerateAddressMutation();
  const { setStorage, dfcAddress } = useStorageContext();

  const handleConfirmClick = () => {
    goToNextStep();
  };

  const generateDfcUniqueAddress = useCallback(
    debounce(async () => {
      setIsLoading(true);

      if (dfcAddress) {
        setDfcUniqueAddress(dfcAddress);
        setIsLoading(false);
      } else {
        try {
          const { address, createdAt } = await generateAddress({
            refundAddress,
          }).unwrap();
          setCreatedBeforeInMSec(getTimeDifference(createdAt));
          setStorage("dfc-address", address);
          setStorage(
            "dfc-address-details",
            JSON.stringify({ address, createdAt, refundAddress }),
          );
          setAddressGenerationError("");
          setDfcUniqueAddress(address);
        } catch ({ data }) {
          if (data?.statusCode === HttpStatusCode.TooManyRequests) {
            setAddressGenerationError(
              "Address generation limit reached, please wait for a minute and try again",
            );
          } else {
            setAddressGenerationError(data?.error);
          }
          setDfcUniqueAddress("");
        } finally {
          setIsLoading(false);
        }
      }
    }, 200),
    [dfcAddress],
  );

  useEffect(() => {
    generateDfcUniqueAddress();
  }, []);

  return (
    <div>
      <div
        className={clsx("flex flex-col mt-6", "md:flex-row md:gap-7 md:mt-4")}
      >
        <div
          className={clsx(
            "max-w-max mx-auto flex flex-row order-1 mt-6 justify-start border-[0.5px] border-dark-200 rounded px-6 pt-6 pb-6 ",
            "md:w-2/5 md:flex-col md:shrink-0 md:order-none md:pb-3 md:mt-0",
            {
              "md:border-error":
                isAddressExpired || addressGenerationError !== "",
            },
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center mt-12 w-[164px]">
              <FiAlertCircle size={48} className="text-dark-1000" />
              <span className="text-center text-xs text-dark-900 mt-6 mb-4">
                Generating address
              </span>
              <FiLoader size={24} className="animate-spin text-brand-100" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className={clsx("w-full relative", "md:w-[164px]")}>
                {isAddressExpired ? (
                  <AddressError
                    delayAction={false}
                    error="Address has expired and is now unavailable for use."
                    onClick={async () => {
                      await generateDfcUniqueAddress();
                      setIsAddressExpired(false);
                    }}
                  />
                ) : (
                  <div>
                    {addressGenerationError !== "" ? (
                      <AddressError
                        delayAction
                        error={addressGenerationError}
                        onClick={async () => generateDfcUniqueAddress()}
                      />
                    ) : (
                      dfcUniqueAddress && (
                        <QrAddress dfcUniqueAddress={dfcUniqueAddress}>
                          {createdBeforeInMSec > 0 && (
                            <div
                              className={clsx("text-left", "md:text-center")}
                            >
                              <TimeLimitCounter
                                time={createdBeforeInMSec}
                                onTimeElapsed={() => {
                                  setStorage("dfc-address", null);
                                  setDfcUniqueAddress("");
                                  setIsAddressExpired(true);
                                }}
                              />
                            </div>
                          )}
                        </QrAddress>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between items-center md:items-start md:mt-6">
          <span className="font-semibold tracking-wider text-dark-900">
            Transfer funds for verification
          </span>
          <p
            className={clsx(
              "text-sm text-dark-700 mt-1 text-center md:text-left",
              "md:mt-2",
            )}
          >
            Use a DeFiChain wallet to send your funds for verification before
            you can complete your transaction.
          </p>
          <div className="pt-6">
            <div className="flex items-center justify-center md:justify-start">
              <div className="text-lg md:text-2xl text-dark-1000 mr-2">
                {destinationDetail.amount.toFixed()}
              </div>
              <Image
                width={100}
                height={100}
                src={sourceDetail.tokenIcon}
                alt={sourceDetail.tokenName}
                className="w-4 md:h-4"
              />
              <div className="ml-1 text-sm md:text-sm text-dark-700">
                {sourceDetail.tokenName}
              </div>
            </div>
            {sourceDetail.tokenName === "DFI" && (
              <div className="text-xs text-warning pt-1 md:pt-0">
                Please only send DFI (UTXO) tokens.
              </div>
            )}
          </div>

          <div className={clsx("hidden self-end", "md:block")}>
            <div className="mt-8">
              {/* Web confirm button */}
              <VerifyButton
                onVerify={handleConfirmClick}
                disabled={
                  addressGenerationError !== "" || dfcUniqueAddress === ""
                }
              />
            </div>
          </div>
        </div>

        {/* Mobile info message */}
        <AlertInfoMessage containerStyle="p-4 mt-6 order-last md:hidden">
          {WarningMessage()}
        </AlertInfoMessage>

        {/* Mobile confirm button */}
        <div className={clsx("order-last", "md:hidden")}>
          <div className={clsx("px-6 mt-6 md:mt-12", "md:px-0")}>
            <VerifyButton
              onVerify={handleConfirmClick}
              disabled={
                addressGenerationError !== "" || dfcUniqueAddress === ""
              }
            />
          </div>
        </div>
      </div>

      {/* Web info message */}
      <div className="hidden md:block">
        <AlertInfoMessage containerStyle="p-4 mt-6 order-last">
          {WarningMessage()}
        </AlertInfoMessage>
      </div>
    </div>
  );
}
