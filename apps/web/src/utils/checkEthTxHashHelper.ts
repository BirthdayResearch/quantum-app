export default function checkEthTxHashHelper(
  transactionInput: string,
): boolean {
  const regex = /^0x([A-Fa-f0-9]{64})$/;
  const isTransactionHash = regex.test(transactionInput);
  return isTransactionHash;
}
