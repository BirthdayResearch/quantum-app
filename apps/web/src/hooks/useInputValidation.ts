import { Dispatch, SetStateAction } from "react";
import { BigNumber } from "bignumber.js";
import { Network, NetworkOptionsI } from "../types";

const useInputValidation = (
  setAmount: Dispatch<SetStateAction<string>>,
  maxAmount: BigNumber,
  selectedFormNetworkB: NetworkOptionsI,
  setAmountErr: Dispatch<SetStateAction<string>>,
) => {
  const validateAmountInput = (value: string, maxValue: BigNumber) => {
    const isSendingToDFC = selectedFormNetworkB.name === Network.DeFiChain;
    let err = "";
    if (isSendingToDFC && new BigNumber(value).gt(maxValue.toFixed(8))) {
      err = "Insufficient Funds";
    }
    if (
      isSendingToDFC &&
      new BigNumber(value).lt(
        new BigNumber(1).dividedBy(new BigNumber(10).pow(8)),
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

  return { validateAmountInput, onInputChange };
};

export default useInputValidation;
