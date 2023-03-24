import clsx from "clsx";
import { FiAlertTriangle } from "react-icons/fi";
import { PropsWithChildren } from "react";

export default function AlertInfoMessage({
  containerStyle,
  children,
}: PropsWithChildren<{
  containerStyle?: string;
}>) {
  return (
    <div
      className={clsx(
        "flex items-center border border-warning rounded-lg",
        containerStyle
      )}
    >
      <FiAlertTriangle size={24} className="shrink-0 text-warning" />
      {children}
    </div>
  );
}
