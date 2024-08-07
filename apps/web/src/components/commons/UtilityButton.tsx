import { PropsWithChildren } from "react";
import clsx from "clsx";
import { RiLoader2Line } from "react-icons/ri";
import { FiArrowRight, FiRefreshCw } from "react-icons/fi";

export default function UtilityButton({
  label,
  onClick,
  disabled = false,
  isLoading = false,
  withArrowIcon = false,
  variant = "primary",
  withRefreshIcon,
  disabledClass,
  responsiveStyle,
  children,
}: PropsWithChildren<{
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  withArrowIcon?: boolean;
  variant?: "primary" | "secondary";
  disabledClass?: string;
  withRefreshIcon?: boolean;
  responsiveStyle?: string;
}>) {
  const isPrimary = variant === "primary";
  const defaultSecondaryStyle =
    "bg-transparent border border-dark-1000 text-dark-1000 hover:border-brand-100 active:opacity-70";
  const defaultPrimaryStyle =
    "bg-dark-1000 text-dark-100 whitespace-nowrap hover:dark-cta-hover active:dark-cta-pressed";
  const defaultSecondaryResponsiveStyle = "text-sm px-4 py-2";
  const defaultPrimaryResponsiveStyle =
    "py-3.5 px-5 text-sm leading-4 md:py-2.5";
  const defaultResponsiveStyle = isPrimary
    ? defaultPrimaryResponsiveStyle
    : defaultSecondaryResponsiveStyle;

  return (
    <button
      type="button"
      className={clsx(
        "w-full flex items-center justify-center rounded-[32px] font-semibold focus-visible:outline-none",
        "md:w-auto",
        isPrimary ? defaultPrimaryStyle : defaultSecondaryStyle,
        responsiveStyle !== undefined
          ? responsiveStyle
          : defaultResponsiveStyle,
        {
          "dark-cta-pressed": isLoading,
          "pointer-events-none opacity-30": disabled || isLoading,
        },
        disabled && disabledClass,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
      {children}
      {isLoading && (
        <RiLoader2Line
          size={16}
          className={clsx("inline-block animate-spin text-dark-100 ml-1")}
        />
      )}
      {withArrowIcon && !isLoading && (
        <FiArrowRight size={16} className="inline-block text-dark-100 ml-0.5" />
      )}
      {withRefreshIcon && (
        <FiRefreshCw size={12} className="inline-block text-dark-100 ml-2" />
      )}
    </button>
  );
}
