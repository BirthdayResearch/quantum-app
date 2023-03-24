import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { FiInfo } from "react-icons/fi";
import useResponsive from "@hooks/useResponsive";
import BottomModal from "./BottomModal";

interface Props {
  content: string;
  title?: string;
  position?: "top" | "right";
  customIconColor?: string;
}

export default function IconTooltip({
  content,
  title,
  position = "top",
  customIconColor,
}: Props): JSX.Element {
  const [tooltipOffset, setTooltipOffset] = useState<string>();
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isLg: isWeb } = useResponsive();

  useEffect(() => {
    if (tooltipRef.current) {
      if (position === "top") {
        setTooltipOffset(`-${tooltipRef.current.offsetHeight}px`);
      }
    }
  }, [tooltipRef]);

  return (
    <div className="relative flex focus:outline-none group cursor-pointer">
      <FiInfo
        size={16}
        className={clsx(customIconColor ?? "text-dark-700")}
        onClick={() => (!isWeb ? setIsMobileModalOpen(true) : null)}
      />
      {isWeb ? (
        /* Display web tooltip */
        <div
          ref={tooltipRef}
          style={{ top: tooltipOffset }}
          className={clsx(
            "invisible absolute w-[328px] z-100 group-hover:visible rounded bg-dark-1000 -mt-1 px-3 py-2 text-sm text-dark-00 text-left",
            position === "top"
              ? "left-1/2 -translate-x-1/2"
              : "left-5 top-1/2 -translate-y-1/2"
          )}
        >
          {content}
        </div>
      ) : (
        /* Display mobile bottom modal instead */
        <BottomModal
          title={title}
          isOpen={isMobileModalOpen}
          onClose={() => setIsMobileModalOpen(false)}
        >
          <div className="mt-4 mb-16 text-dark-700">
            <span>{content}</span>
          </div>
        </BottomModal>
      )}
    </div>
  );
}
