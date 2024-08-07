import { PropsWithChildren } from "react";
import { useDeFiScanContext } from "@contexts/DeFiScanContext";
import { NetworkI, networks } from "@contexts/NetworkContext";
import Image from "next/image";
import NumericFormat from "@components/commons/NumericFormat";
import BigNumber from "bignumber.js";
import { FiArrowUpRight, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useContractContext } from "@contexts/ContractContext";
import { Network, TokenDetailI, TokensI } from "types";
import clsx from "clsx";
import useResponsive from "@hooks/useResponsive";
import { Disclosure } from "@headlessui/react";
import IconTooltip from "./commons/IconTooltip";

function TokenOrNetworkInfo({
  token,
  testId,
  iconClass,
  nameClass,
  onClose,
}: {
  token: TokenDetailI<string> | NetworkI<string>;
  testId?: string;
  iconClass?: string;
  nameClass?: string;
  onClose?: () => void;
}) {
  return (
    <div
      className="flex flex-row items-center justify-between"
      {...(onClose && { onClick: onClose })}
    >
      <div className="flex flex-row items-center">
        <Image
          width={100}
          height={100}
          src={token.icon}
          alt={token.name}
          data-testid={`${testId}-icon`}
          className={iconClass ?? "h-8 w-8"}
        />
        <span
          data-testid={`${testId}-name`}
          className={clsx(
            "ml-2 lg:ml-3 block truncate text-dark-1000 text-base text-left",
            nameClass,
          )}
        >
          {token.name}
          {(token as TokenDetailI<string>).subtitle && (
            <span className="block text-xs text-dark-700">
              {(token as TokenDetailI<string>).subtitle}
            </span>
          )}
        </span>
      </div>
      {onClose !== undefined && (
        <FiChevronUp className="h-6 w-6 text-dark-1000 transition-[transform]" />
      )}
    </div>
  );
}

function AddressComponent({
  testId,
  address,
  isDeFiAddress,
}: {
  testId: string;
  address: string;
  isDeFiAddress: boolean;
}) {
  const { ExplorerURL } = useContractContext();
  const { getAddressUrl } = useDeFiScanContext();
  const url = isDeFiAddress
    ? getAddressUrl(address)
    : `${ExplorerURL}/address/${address}`;
  return (
    <a
      className="flex flex-col lg:flex-row items-end lg:items-center justify-end lg:justify-start text-dark-1000 text-xs lg:text-base font-semibold text-right lg:text-left break-all flex-1"
      href={url}
      target="_blank"
      rel="noreferrer"
      data-testid={testId}
    >
      {address}
      <div className="flex flex-row justify-between items-center mt-1 lg:mt-0 mb-1 lg:mb-0">
        <FiArrowUpRight className="text-dark-1000 mr-1 lg:mr-0 lg:ml-1 h-4 w-4" />
        <span className="lg:hidden font-semibold text-sm">View</span>
      </div>
    </a>
  );
}

function BorderDiv({
  children,
  className,
  testId,
}: PropsWithChildren<{ className: string; testId?: string }>) {
  return (
    <div
      data-testid={testId}
      className={clsx(
        "border-gradient-6 relative bg-dark-00/50 rounded-[15px]",
        "before:absolute before:content-[''] before:inset-0 before:p-px before:rounded-[15px] before:z-[-1]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function TokenDetails({
  network,
  token,
  isDeFiAddress,
  amount,
  containerClass,
  onClose,
  testId,
}: {
  network: NetworkI<string>;
  token: TokenDetailI<string>;
  isDeFiAddress: boolean;
  amount: BigNumber;
  containerClass?: string;
  onClose?: () => void;
  testId?: string;
}) {
  const { BridgeV1, HotWalletAddress } = useContractContext();
  const address = isDeFiAddress ? HotWalletAddress : BridgeV1.address;
  return (
    <div
      className={clsx(
        "flex flex-col md:w-1/2 lg:w-full lg:flex-row space-y-5 lg:space-y-0 justify-between items-center",
        containerClass,
      )}
    >
      <div className="w-full lg:w-2/12">
        <TokenOrNetworkInfo
          testId={testId}
          token={token}
          onClose={onClose}
          nameClass="font-semibold lg:font-normal"
          iconClass="h-6 w-6 md:h-8 md:w-8"
        />
      </div>
      <div className="w-full flex flex-row items-center justify-between lg:w-2/12">
        <span className="lg:hidden text-dark-700 text-sm w-5/12">
          Blockchain
        </span>
        <TokenOrNetworkInfo
          testId={`${testId}-network`}
          token={network}
          iconClass="h-5 w-5 lg:h-8 lg:w-8"
        />
      </div>
      <div className="w-full flex flex-row items-center justify-between lg:w-4/12">
        <div className="flex flex-row items-center lg:hidden text-dark-700 w-5/12 space-x-1">
          <span className="text-sm">Liquidity</span>
          <IconTooltip
            size={16}
            position="top"
            customIconColor="text-dark-700"
            content="The max amount available to bridge for a specific token."
          />
        </div>
        <NumericFormat
          testId={`${testId}-liquidity`}
          className="text-dark-1000 text-sm lg:text-base text-dark-1000 text-right lg:text-left flex-1"
          value={amount}
          decimalScale={8}
          thousandSeparator
          suffix={` ${token.name}`}
        />
      </div>
      <div className="w-full flex flex-row items-start lg:items-center justify-between lg:w-4/12">
        <span className="lg:hidden text-dark-700 text-sm w-5/12">Address</span>
        <AddressComponent
          testId={`${testId}-address`}
          address={address}
          isDeFiAddress={isDeFiAddress}
        />
      </div>
    </div>
  );
}

export default function OverviewList({ balances }) {
  const [firstNetwork, secondNetwork] = networks;
  const { isMobile } = useResponsive();

  const getAmount = (symbol: string, network): BigNumber => {
    if (network === Network.DeFiChain) {
      return new BigNumber(balances.DFC?.[symbol] ?? 0);
    }
    return new BigNumber(balances.EVM?.[symbol] ?? 0);
  };

  function getTokenRow(item: TokensI, onClose?: () => void) {
    return (
      <>
        <TokenDetails
          network={secondNetwork}
          testId={`${item.tokenA.name}-${secondNetwork.name}`}
          token={item.tokenA}
          isDeFiAddress={secondNetwork.name === Network.DeFiChain}
          amount={getAmount(item.tokenA.symbol, secondNetwork.name)}
          onClose={onClose}
          containerClass="pb-4 md:pb-0 lg:pb-5 md:pr-5 lg:pr-0"
        />
        <TokenDetails
          testId={`${item.tokenB.name}-${firstNetwork.name}`}
          network={firstNetwork}
          token={item.tokenB}
          isDeFiAddress={firstNetwork.name === Network.DeFiChain}
          amount={getAmount(item.tokenB.symbol, firstNetwork.name)}
          containerClass={clsx(
            "border-t-[0.5px] md:border-t-0 md:border-l-[0.5px] lg:border-l-0 lg:border-t-[0.5px] border-dark-200",
            "pt-4 md:pt-0 lg:pt-5 md:pl-5 lg:pl-0",
          )}
        />
      </>
    );
  }

  function getTokenCard(item: TokensI) {
    return (
      <Disclosure>
        {({ open, close }) => (
          <>
            {!open && (
              <Disclosure.Button>
                <div
                  className="flex flex-row justify-between items-center"
                  data-testid={`${item.tokenA}-accordion`}
                >
                  <div className="flex flex-row items-center">
                    <div className="mr-3">
                      <TokenOrNetworkInfo
                        token={item.tokenA}
                        iconClass="h-6 w-6"
                        nameClass="font-semibold"
                      />
                    </div>
                    <div className="pl-3 border-l-[0.5px] border-dark-200">
                      <TokenOrNetworkInfo
                        token={item.tokenB}
                        iconClass="h-6 w-6"
                        nameClass="font-semibold"
                      />
                    </div>
                  </div>
                  <FiChevronDown
                    className="h-6 w-6 text-dark-1000 transition-[transform]"
                    data-testid="liquidity-mobile-dropdownArrow"
                  />
                </div>
              </Disclosure.Button>
            )}
            <Disclosure.Panel className="text-gray-500">
              {getTokenRow(item, close)}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    );
  }

  return (
    <>
      <div className="hidden lg:block mt-6 md:mt-8 lg:mt-12">
        <div className="flex flex-row px-8 py-4">
          <div className="text-dark-1000 text-sm font-semibold w-2/12">
            Token
          </div>
          <div className="text-dark-1000 text-sm font-semibold w-2/12">
            Blockchain
          </div>
          <div className="flex flex-row items-center text-dark-1000 text-sm w-4/12 space-x-1">
            <span className="font-semibold">Liquidity </span>
            <IconTooltip
              position="top"
              size={12}
              customIconColor="text-dark-1000"
              content="The max amount available to bridge for a specific token."
            />
          </div>
          <div className="text-dark-1000 text-sm font-semibold w-4/12">
            Address
          </div>
        </div>
      </div>
      <div className="space-y-3 md:space-y-4 px-5 md:px-0">
        {secondNetwork.tokens.map((item) => (
          <BorderDiv
            testId={`${item.tokenA.name}-row`}
            key={item.tokenA.name}
            className="px-4 md:px-5 lg:px-8 py-5 md:py-6 lg:py-5 flex flex-col md:flex-row lg:flex-col"
          >
            {isMobile ? getTokenCard(item) : getTokenRow(item)}
          </BorderDiv>
        ))}
      </div>
    </>
  );
}
