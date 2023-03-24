import BigNumber from "bignumber.js";
import { useEffect, useRef, useState } from "react";

export default function useTimeCounter(
  initialCounter: number,
  onTimeCounterEnd: () => void
) {
  const [timeRemaining, setTimeRemaining] = useState<BigNumber>(
    new BigNumber(initialCounter)
  );
  const intervalRef = useRef<any>(null);

  const decreaseTimeRemaining = () =>
    setTimeRemaining((time) => BigNumber.max(time.minus(1000), 0));
  useEffect(() => {
    intervalRef.current = setInterval(decreaseTimeRemaining, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (timeRemaining.lte(0)) {
      clearInterval(intervalRef.current);
      onTimeCounterEnd();
    }
  }, [timeRemaining]);

  const timeLimitPercentage = timeRemaining
    .dividedBy(initialCounter)
    .multipliedBy(100)
    .toNumber();

  return { timeLimitPercentage, timeRemaining };
}
