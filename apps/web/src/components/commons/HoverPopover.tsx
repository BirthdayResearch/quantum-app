import { JSX } from "@babel/types";
import { ReactNode, useState } from "react";
import { useFloating, shift } from "@floating-ui/react-dom";
import clsx from "clsx";

export default function HoverPopover({
  className,
  popover,
  placement,
  children,
}: {
  className?: string;
  popover: string;
  placement: "top" | "right";
  children?: ReactNode;
}): JSX.Element {
  const [isHover, setIsHover] = useState(false);

  const { x, y, reference, floating, strategy } = useFloating({
    placement: placement ?? "bottom",
    middleware: [shift()],
    strategy: "fixed",
  });

  return (
    <>
      <div
        ref={reference}
        onFocus={() => setIsHover(true)}
        onMouseOver={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onTouchCancel={() => setIsHover(false)}
        className={clsx(className, "cursor-pointer")}
      >
        {children}
      </div>

      {(() => {
        if (!isHover) {
          return null;
        }

        return (
          <div
            ref={floating}
            style={{
              position: strategy,
              top: y ?? "",
              left: x ?? "",
            }}
            className="p-2 z-20"
          >
            <div className=" w-[328px] rounded bg-dark-1000 px-3 py-2 text-sm text-dark-00 text-left">
              {popover}
            </div>
          </div>
        );
      })()}
    </>
  );
}
