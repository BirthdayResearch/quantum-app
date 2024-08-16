import clsx from "clsx";
import React, { PropsWithChildren, useState } from "react";

interface Props {
  content: string;
  containerClass?: string;
  disableTooltip?: boolean;
}

export default function Tooltip({
  content,
  children,
  containerClass = "",
  disableTooltip = false,
}: PropsWithChildren<Props>): JSX.Element {
  let timeout: NodeJS.Timeout;
  const [active, setActive] = useState<boolean>(false);

  const showTooltip = () => {
    timeout = setTimeout(() => {
      setActive(true);
    }, 300);
  };

  const hideTooltip = () => {
    clearInterval(timeout);
    setActive(false);
  };

  return (
    <div
      role="button"
      aria-label="tooltip-button"
      className={clsx(
        "relative inline-block rounded-full p-1 focus-visible:outline-none",
        containerClass,
      )}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onMouseDown={hideTooltip}
      onKeyDown={() => {}}
      tabIndex={0}
    >
      {children}
      {!disableTooltip && active && (
        <div
          className={`absolute left-1/2 -top-8 z-[100] -translate-x-1/2 whitespace-nowrap rounded-lg bg-dark-1000 px-3 py-1 text-sm text-dark-00
          before:absolute before:left-1/2 before:top-[20%] before:-z-[1] before:-ml-2.5 before:h-0 before:w-0 before:rotate-45 before:rounded-[1px]
          before:border-[10.5px] before:border-transparent before:border-t-dark-1000 before:bg-dark-1000`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
