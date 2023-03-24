import { useTheme } from "@contexts/ThemeProvider";
import { FiMoon } from "react-icons/fi";
import { MdOutlineWbSunny } from "react-icons/md";

export default function ThemeSwitch() {
  const { setTheme, isLight } = useTheme();

  const handleOnClick = () => {
    const newTheme = isLight ? "dark" : "light";
    setTheme(newTheme);
  };

  return (
    <button
      type="button"
      onClick={handleOnClick}
      className="h-4 w-4 bg-light-00 text-light-1000 dark:bg-dark-00 dark:text-dark-1000"
    >
      {isLight ? <FiMoon /> : <MdOutlineWbSunny />}
    </button>
  );
}
