import Image from "next/image";
import Link from "next/link";
import ConnectButton from "./ConnectButton";
import Banner from "./Banner";

export default function Header(): JSX.Element {
  return (
    <div className="relative z-[1] flex flex-col">
      <Banner />
      <div className="flex items-center justify-between px-5 md:px-10 lg:px-[120px] pt-8 pb-6 md:py-6 lg:py-8">
        <Link href="/">
          <div className="relative cursor-pointer w-[85px] h-[15px] md:-ml-1 lg:-ml-2 md:w-[132px] md:h-[24.5px] lg:h-[31.5px] lg:w-[170px]">
            <Image
              fill
              data-testid="header-bridge-logo"
              src="/header-no-byline.svg"
              alt="Bridge Logo"
            />
          </div>
        </Link>
        <div className="flex h-9 items-center md:h-10 lg:h-12">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
