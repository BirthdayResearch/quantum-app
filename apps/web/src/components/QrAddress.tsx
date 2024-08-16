import QRCode from "react-qr-code";
import clsx from "clsx";
import { PropsWithChildren, useEffect, useState } from "react";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import Tooltip from "@components/commons/Tooltip";
import useResponsive from "../hooks/useResponsive";

export function SuccessCopy({
  containerClass,
  show,
}: {
  containerClass: string;
  show: boolean;
}) {
  return (
    <div
      className={clsx(
        "absolute md:w-full text-center",
        show ? "opacity-100" : "opacity-0",
        containerClass,
      )}
    >
      <span className="rounded bg-valid px-2 py-1 text-xs text-dark-00  transition duration-300 md:text-xs">
        Copied to clipboard
      </span>
    </div>
  );
}

interface Props {
  dfcUniqueAddress: string;
}

export default function QrAddress({
  dfcUniqueAddress,
  children,
}: PropsWithChildren<Props>) {
  const [showSuccessCopy, setShowSuccessCopy] = useState(false);
  const { copy } = useCopyToClipboard();
  const { isMobile } = useResponsive();

  const handleOnCopy = (text) => {
    copy(text);
    setShowSuccessCopy(true);
  };

  useEffect(() => {
    if (showSuccessCopy) {
      setTimeout(() => setShowSuccessCopy(false), 2000);
    }
  }, [showSuccessCopy]);

  return (
    <div
      className={clsx(
        "flex flex-row items-center w-full",
        "md:flex-col md:w-[164px]",
      )}
    >
      <SuccessCopy
        containerClass="m-auto right-0 left-0 top-2"
        show={showSuccessCopy}
      />
      <div
        className={clsx("h-[116px] bg-dark-1000 p-0.5 rounded", "md:h-[164px]")}
      >
        <QRCode value={dfcUniqueAddress} size={isMobile ? 112 : 160} />
      </div>
      <div className={clsx("flex flex-col pl-4", "md:pl-0")}>
        <div
          className={clsx("text-xs font-semibold text-dark-900", "md:hidden")}
        >
          Transaction address
        </div>
        <Tooltip
          content="Click to copy address"
          containerClass={clsx("relative -mt-1", "md:mt-1")}
        >
          <button
            type="button"
            className={clsx(
              "text-dark-700 break-all focus-visible:outline-none text-left",
              "text-xs cursor-pointer hover:underline",
              "md:text-center md:mt-2",
            )}
            onClick={() => handleOnCopy(dfcUniqueAddress)}
          >
            {dfcUniqueAddress}
          </button>
        </Tooltip>
        {children}
      </div>
    </div>
  );
}
