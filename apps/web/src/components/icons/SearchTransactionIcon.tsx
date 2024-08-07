import clsx from "clsx";
import Image from "next/image";

export default function SearchTransactionIcon({
  customStyle,
}: {
  customStyle?: string;
}) {
  return (
    <div
      className={clsx(
        "relative mr-2 p-3 rounded-full border-[1px] border-dark-300/50 bg-dark-00 items-center flex justify-center w-[66px] h-[66px] -mt-14 md:mt-0",
        customStyle,
      )}
    >
      <div className={clsx("relative w-[33px] h-[33px]")}>
        <Image
          fill
          data-testid="search-queued-transaction"
          src="/search-transaction.svg"
          alt="Search Queued Transaction"
        />
      </div>
    </div>
  );
}
