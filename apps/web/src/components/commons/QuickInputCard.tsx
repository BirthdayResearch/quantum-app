import BigNumber from "bignumber.js";
import clsx from "clsx";
import { IoCloseCircleSharp } from "react-icons/io5";
import { HiLockClosed } from "react-icons/hi";
import { Strategy } from "@floating-ui/react-dom";
import { Dispatch, SetStateAction } from "react";
import InputSelector from "../InputSelector";
import { SelectionType, TokensI } from "../../types";

interface QuickInputCardProps {
  maxValue: BigNumber;
  value: string;
  onChange: (amount: string) => void;
  error?: string;
  showAmountsBtn?: boolean;
  disabled?: boolean;
  showTokenDropdown?: boolean;
  tokenDropDownValue?: TokensI;
  floatingObj?: {
    floating: (node: HTMLElement | null) => void;
    strategy: Strategy;
    y: number | null;
  };
  options?: TokensI[];
  setSelectedTokens?: Dispatch<SetStateAction<TokensI>>;
  testId: string;
}

interface SetAmountButtonProps {
  type: AmountButtonTypes;
  onClick: (amount: string) => void;
  amount: BigNumber;
  hasBorder?: boolean;
  disabled?: boolean;
}

export enum AmountButtonTypes {
  TwentyFive = "25%",
  Half = "50%",
  SeventyFive = "75%",
  Max = "Max",
}

export enum TransactionCardStatus {
  Default,
  Active,
  Error,
}

function SetAmountButton({
  type,
  onClick,
  amount,
  hasBorder,
  disabled,
}: SetAmountButtonProps): JSX.Element {
  const decimalPlace = 5;

  // ROUND_FLOOR is used to prevent the amount from being rounded up and exceeding the max amount
  let value = amount.toFixed(decimalPlace, BigNumber.ROUND_FLOOR);
  switch (type) {
    case AmountButtonTypes.TwentyFive:
      value = amount
        .multipliedBy(0.25)
        .toFixed(decimalPlace, BigNumber.ROUND_FLOOR);
      break;
    case AmountButtonTypes.Half:
      value = amount
        .multipliedBy(0.5)
        .toFixed(decimalPlace, BigNumber.ROUND_FLOOR);
      break;
    case AmountButtonTypes.SeventyFive:
      value = amount
        .multipliedBy(0.75)
        .toFixed(decimalPlace, BigNumber.ROUND_FLOOR);
      break;
    case AmountButtonTypes.Max:
    default:
      value = amount.toFixed(decimalPlace, BigNumber.ROUND_FLOOR);
      break;
  }

  return (
    <button
      type="button"
      className={clsx(
        "w-full bg-dark-700 hover:hover-text-gradient-1 bg-clip-text",
        {
          "border-r-[0.5px] border-dark-300/50": hasBorder,
        },
      )}
      onClick={(): void => {
        onClick(value);
      }}
      disabled={disabled}
    >
      <div className="py-1 lg:py-0.5">
        <span className="font-semibold text-sm lg:text-base text-transparent">
          {type}
        </span>
      </div>
    </button>
  );
}

export function QuickInputCard({
  value,
  maxValue,
  onChange,
  error = "",
  disabled,
  showAmountsBtn = true,
  showTokenDropdown = false,
  floatingObj,
  tokenDropDownValue,
  options,
  setSelectedTokens,
  testId,
}: QuickInputCardProps): JSX.Element {
  return (
    <div
      className={clsx(
        "relative w-full outline-0 group rounded-lg mt-1 lg:mt-2 border",
        { "pointer-events-none bg-dark-100": disabled },
        error === ""
          ? "border-dark-300 hover:border-dark-500 focus-within:!border-transparent focus-within:before:dark-gradient-2 focus-within:before:-inset-[1px] focus-within:before:rounded-lg focus-within:before:p-px"
          : "border-error",
      )}
    >
      <div className="flex">
        <div
          className={clsx("flex flex-row px-4 lg:px-5 py-3.5 w-full", {
            "pr-0 lg:pr-0": showTokenDropdown,
          })}
        >
          <input
            data-testid={testId}
            className={clsx(
              "w-full max-h-36 grow resize-none bg-transparent text-base text-dark-1000 focus:outline-none caret-dark-1000 placeholder-dark-500 hover:placeholder-dark-800 focus:placeholder-dark-300",
            )}
            placeholder="0.00"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            spellCheck={false}
          />
          {value !== "" && !disabled && (
            <IoCloseCircleSharp
              size={20}
              onClick={() => onChange("")}
              className="text-dark-500 self-center cursor-pointer ml-1"
            />
          )}
          {disabled && (
            <span className="self-center">
              <HiLockClosed size={18} className="text-dark-800" />
            </span>
          )}
        </div>
        {setSelectedTokens &&
          floatingObj &&
          tokenDropDownValue &&
          showTokenDropdown && (
            <div className="md:w-3/5 w-full ml-2 self-center">
              <InputSelector
                isWithQuickInputCard
                type={SelectionType.Token}
                popUpLabel="Select token"
                floatingObj={floatingObj}
                value={tokenDropDownValue}
                options={options}
                onSelect={(tokenValue: TokensI) =>
                  setSelectedTokens(tokenValue)
                }
              />
            </div>
          )}
      </div>
      {showAmountsBtn && (
        <div className="flex flex-row justify-between items-center py-1.5 border-t border-dark-300/50 bg-dark-gradient-3">
          {Object.values(AmountButtonTypes).map((type, index, { length }) => (
            <SetAmountButton
              key={type}
              amount={maxValue}
              onClick={onChange}
              type={type}
              hasBorder={length - 1 !== index}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
