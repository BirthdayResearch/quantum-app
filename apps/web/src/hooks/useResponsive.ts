import { useMediaQuery } from "react-responsive";
import { theme } from "../../tailwind.config";

const useResponsive = () => {
  const { screens } = theme;

  const isMobile = useMediaQuery({ maxWidth: `calc(${screens.md} - 1px)` });

  const isXs = useMediaQuery({ minWidth: screens.xs });

  const isSm = useMediaQuery({ minWidth: screens.sm });

  const isMd = useMediaQuery({ minWidth: screens.md });

  const isLg = useMediaQuery({ minWidth: screens.lg });

  const isXl = useMediaQuery({ minWidth: screens.xl });

  const is2xl = useMediaQuery({ minWidth: screens["2xl"] });

  const is3xl = useMediaQuery({ minWidth: screens["3xl"] });

  type Key = `is${Capitalize<keyof typeof screens>}`;
  return {
    isMobile,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    is3xl,
  } as Record<Key | "isMobile", boolean>;
};

export default useResponsive;
