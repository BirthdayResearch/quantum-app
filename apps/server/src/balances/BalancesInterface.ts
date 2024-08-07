import { SupportedDFCTokenSymbols, SupportedEVMTokenSymbols } from '../AppConfig';

type NetworkSymbols = 'DFC' | 'EVM';

export type NetworkBalances = { [key in SupportedEVMTokenSymbols | SupportedDFCTokenSymbols]: string };

export type Balances = {
  [key in NetworkSymbols]: NetworkBalances;
};
