import clsx from "clsx";
import React, { useState } from "react";
import { FiInfo } from "react-icons/fi";
import useResponsive from "@hooks/useResponsive";
import BottomModal from "./BottomModal";
import HoverPopover from "./HoverPopover";

interface Props {
  content: string;
  title?: string;
  position?: "top" | "right";
  customIconColor?: string;
  size?: number;
}

export default function IconTooltip({
  content,
  title,
  position = "top",
  customIconColor,
  size,
}: Props): JSX.Element {
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const { isLg: isWeb } = useResponsive();

  return (
    <div className="relative flex focus:outline-none group cursor-pointer">
      {isWeb ? (
        /* Display web tooltip */
        <HoverPopover
          className={clsx("group lg:block hidden")}
          popover={content}
          placement={position}
        >
          <div data-testid="IconTooltipPopover">
            <FiInfo
              size={size ?? 16}
              className={clsx(customIconColor ?? "text-dark-700")}
            />
          </div>
        </HoverPopover>
      ) : (
        /* Display mobile bottom modal instead */
        <>
          <FiInfo
            size={size ?? 16}
            className={clsx(customIconColor ?? "text-dark-700 block lg:hidden")}
            onClick={() => (!isWeb ? setIsMobileModalOpen(true) : null)}
          />
          <BottomModal
            title={title}
            isOpen={isMobileModalOpen}
            onClose={() => setIsMobileModalOpen(false)}
          >
            <div className="mt-4 mb-16 text-dark-700">
              <span>{content}</span>
            </div>
          </BottomModal>
        </>
      )}
    </div>
  );
}
