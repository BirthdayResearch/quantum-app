import { useEffect } from "react";

/**
 * Updates the height of a <textarea> when the value changes
 * @param textAreaRef
 * @param dependencyArr
 */
export default function useAutoResizeTextArea(
  textAreaRef: HTMLTextAreaElement | null,
  dependencyArr: string[],
) {
  const ref = textAreaRef;
  useEffect(() => {
    if (ref) {
      // Remove height temporarily to get the correct scrollHeight for the textarea
      ref.style.height = "0px";

      // Then set the height directly
      ref.style.height = `${ref.scrollHeight}px`;
    }
  }, [ref, dependencyArr]);
}
