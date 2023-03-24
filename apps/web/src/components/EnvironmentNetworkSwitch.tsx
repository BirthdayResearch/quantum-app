import clsx from "clsx";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import { EnvironmentNetwork } from "@waveshq/walletkit-core";

export default function EnvironmentNetworkSwitch({
  onChange,
  disabled = false,
}: {
  onChange: () => void;
  disabled?: boolean;
}): JSX.Element {
  const { networkEnv: currentNetworkEnv, updateNetworkEnv } =
    useNetworkEnvironmentContext();

  const handleOnClick = () => {
    const isProduction = process.env.NODE_ENV === "production";
    let nextNetworkEnv: EnvironmentNetwork;
    switch (currentNetworkEnv) {
      case EnvironmentNetwork.TestNet:
        nextNetworkEnv = isProduction
          ? EnvironmentNetwork.MainNet
          : EnvironmentNetwork.LocalPlayground;
        break;
      case EnvironmentNetwork.LocalPlayground:
        nextNetworkEnv = EnvironmentNetwork.MainNet;
        break;
      case EnvironmentNetwork.MainNet:
      default:
        nextNetworkEnv = EnvironmentNetwork.TestNet;
        break;
    }
    updateNetworkEnv(nextNetworkEnv);
    onChange();
  };

  return (
    <button
      data-testid="network-env-switch"
      type="button"
      className={clsx(
        "flex items-center rounded-[37px] dark-section-bg border border-dark-card-stroke px-2 py-1 ml-2 hover:dark-btn-hover hover:border-dark-500",
        "lg:px-2.5 lg:py-1.5",
        {
          "pointer-events-none": disabled,
        }
      )}
      onClick={handleOnClick}
      disabled={disabled}
    >
      <div
        className={clsx(
          "w-2 h-2 rounded-full mr-1",
          currentNetworkEnv === EnvironmentNetwork.MainNet
            ? "bg-valid"
            : "bg-warning"
        )}
      />
      <span className="text-dark-1000 text-2xs font-bold tracking-widest uppercase">
        {currentNetworkEnv}
      </span>
    </button>
  );
}
