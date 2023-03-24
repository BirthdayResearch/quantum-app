import { PropsWithChildren } from "react";
import clsx from "clsx";

/**
 * Container implementation that is part of the design language.
 */
export default function Container({
  className,
  children,
}: PropsWithChildren<{ className?: string }>): JSX.Element {
  return <div className={clsx("container mx-auto", className)}>{children}</div>;
}
