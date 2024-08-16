import BigNumber from "bignumber.js";

interface NumericFormatProps extends BigNumber.Format {
  value: string | number | BigNumber;
  className?: string;
  thousandSeparator?: boolean;
  decimalScale?: number;
  trimTrailingZeros?: boolean;
  testId?: string;
}

export default function NumericFormat({
  value,
  className,
  prefix = "",
  suffix = "",
  thousandSeparator,
  decimalScale = 8,
  trimTrailingZeros = false,
  testId,
}: NumericFormatProps): JSX.Element {
  const fmt: BigNumber.Format = {
    prefix,
    suffix,
    decimalSeparator: ".",
    groupSeparator: thousandSeparator ? "," : "",
    groupSize: thousandSeparator ? 3 : 0,
  };

  let formattedNumber = new BigNumber(value).toFormat(decimalScale, fmt);
  if (trimTrailingZeros) {
    const num = formattedNumber.split(" ")[0].replace(/\.?0+$/, "");
    formattedNumber = `${num} ${suffix}`;
  }

  return (
    <span className={className} data-testid={testId}>
      {formattedNumber}
    </span>
  );
}
