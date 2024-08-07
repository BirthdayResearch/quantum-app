import clsx from "clsx";

export default function VerifiedUtilityButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "w-full rounded-[32px] font-bold focus-visible:outline-none",
        "md:w-auto md:font-semibold",
        "after:-bottom-0.5 after:relative after:ml-1 after:content-[url('/verified-16x16.svg')]",
        "bg-transparent border border-dark-300 text-sm text-valid px-4 py-2 active:opacity-70",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
