export default function truncateTextFromMiddle(
  text: string,
  length = 5,
): string {
  if (text.length <= length) {
    return text;
  }
  return `${text.substring(0, length)}...${text.substring(
    text.length - length,
    text.length,
  )}`;
}
