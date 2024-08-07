import { CircularProgressbarWithChildren } from "react-circular-progressbar";
import { useEffect, useState } from "react";
import clsx from "clsx";
import ContentLoader from "react-content-loader";
import { FormOptions } from "@contexts/NetworkContext";
import useResponsive from "../hooks/useResponsive";

function SkeletonLoader({ isDesktop }: { isDesktop: boolean }) {
  const viewBoxWidth = isDesktop ? "90" : "65";
  const x = isDesktop ? "5" : "0";
  const width = isDesktop ? "80" : "60";
  const height = isDesktop ? "20" : "16";

  return (
    <div className={clsx("flex items-center border-dark-300 text-dark-500")}>
      <ContentLoader
        speed={2}
        height={24}
        viewBox={`0 0 ${viewBoxWidth} 24`}
        backgroundColor="#4a4a4a"
        foregroundColor="#4a4a4a"
        backgroundOpacity={0.4}
        foregroundOpacity={1}
      >
        <rect x={x} y="2" rx="5" ry="5" width={width} height={height} />
      </ContentLoader>
    </div>
  );
}

export default function ConfirmationProgress({
  confirmationBlocksTotal,
  confirmationBlocksCurrent,
  isConfirmed,
  isApiSuccess,
  txnType,
  showCircular = false,
  activeTab,
}: {
  confirmationBlocksTotal: number;
  confirmationBlocksCurrent: string;
  isConfirmed: boolean;
  isApiSuccess: boolean;
  txnType: string;
  showCircular?: boolean;
  activeTab: FormOptions;
}) {
  const { isLg } = useResponsive();
  const [valuePercentage, setValuePercentage] = useState<number>(0);

  useEffect(() => {
    setValuePercentage(
      (Number(confirmationBlocksCurrent) * 100) / confirmationBlocksTotal,
    );
  }, [confirmationBlocksCurrent]);

  return (
    <div className="w-full">
      {isLg || showCircular ? (
        <div className="w-[136px] h-[136px]">
          <svg style={{ height: 0, width: 0 }}>
            <defs>
              {isConfirmed ? (
                <linearGradient
                  id={`circularProgress_${activeTab}`}
                  gradientTransform="rotate(90)"
                >
                  <stop offset="0%" stopColor="#0CC72C" />
                </linearGradient>
              ) : (
                <linearGradient
                  id={`circularProgress_${activeTab}`}
                  gradientTransform="rotate(90)"
                >
                  <stop offset="0%" stopColor="#FF00FF" />
                  <stop offset="100.4%" stopColor="#EC0C8D" />
                </linearGradient>
              )}
            </defs>
          </svg>
          <CircularProgressbarWithChildren
            value={valuePercentage}
            strokeWidth={3}
            counterClockwise
            styles={{
              path: { stroke: `url("#circularProgress_${activeTab}")` },
              trail: { stroke: "#2B2B2B" },
            }}
          >
            <div className="text-center">
              {isApiSuccess || isConfirmed ? (
                <div className="text-lg font-semibold text-dark-1000">{`${confirmationBlocksCurrent} of ${confirmationBlocksTotal}`}</div>
              ) : (
                <SkeletonLoader isDesktop />
              )}

              <span className="text-xs text-dark-700">
                {isConfirmed ? "Confirmed" : txnType}
              </span>
            </div>
          </CircularProgressbarWithChildren>
        </div>
      ) : (
        <div>
          <div className="flex text-sm text-dark-700">
            {isApiSuccess || isConfirmed ? (
              <span className="font-semibold text-dark-1000">
                {`${confirmationBlocksCurrent} of ${confirmationBlocksTotal}\u00A0`}
              </span>
            ) : (
              <SkeletonLoader isDesktop={false} />
            )}
            {isConfirmed ? "Confirmed" : txnType}
          </div>
          <div className="h-1.5 w-full bg-dark-200 rounded-md">
            <div
              style={{ width: `${valuePercentage}%` }}
              className={clsx(
                "h-full rounded-md mt-2",
                isConfirmed ? "bg-valid" : "bg-brand-100",
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
