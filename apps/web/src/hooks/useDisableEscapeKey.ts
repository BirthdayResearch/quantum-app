import { useEffect } from "react";

/**
 * Used to prevent modal from closing when Esc key is pressed
 * `disable` param should be passed so that Esc key is only disabled when a modal is open, and not affect the entire app
 * @param disable
 */
export default function useDisableEscapeKey(disable: boolean) {
  useEffect(() => {
    const disableEscapeKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape" && disable) {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", disableEscapeKeyPress);

    return () => {
      document.removeEventListener("keydown", disableEscapeKeyPress);
    };
  }, [disable]);
}
