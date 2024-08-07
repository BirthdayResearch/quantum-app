import { FaReddit, FaGithub, FaTwitter } from "react-icons/fa";
import { BsMedium } from "react-icons/bs";
import Image from "next/image";
import { useBridgeVersionQuery } from "store";
import Socials from "./commons/Socials";

const DeFiChainSocialItems = [
  {
    icon: FaTwitter,
    testId: "twitter_dfc",
    label: "Twitter",
    href: "https://twitter.com/defichain",
  },
  {
    icon: FaReddit,
    testId: "reddit_dfc",
    label: "Reddit",
    href: "https://www.reddit.com/r/defiblockchain",
  },
  {
    icon: FaGithub,
    testId: "gitHub_dfc",
    label: "GitHub",
    href: "https://github.com/DeFiCh",
  },
];
const BirthdayResearchSocialItems = [
  {
    icon: FaTwitter,
    testId: "twitter_br",
    label: "Twitter",
    href: "https://twitter.com/BirthdayDev/",
  },
  {
    icon: BsMedium,
    testId: "medium_br",
    label: "Medium",
    href: "https://medium.com/@birthdayresearch",
  },
  {
    icon: FaGithub,
    testId: "gitHub_br",
    label: "GitHub",
    href: "https://github.com/BirthdayResearch/quantum-app",
  },
];

export default function Footer() {
  const { data } = useBridgeVersionQuery();

  return (
    <footer
      data-testid="footer"
      className="relative z-[1] w-full border-dark-300 pt-6 md:pt-5 lg:pt-8 bg-gradient-to-r from-[#00000066] to-[#00000000]"
    >
      <section
        data-testid="footer_web"
        className="text-dark-900 px-6 md:px-12 lg:px-[120px] pb-12 lg:pb-8 text-sm"
      >
        <div className="border-t-[0.5px] border-dark-300 py-4 md:py-6 lg:py-8">
          <div className="relative w-[216px] h-6 md:w-[252px] md:h-7 lg:h-9 lg:w-[316px]">
            <Image
              fill
              data-testid="footer-bridge-logo"
              src="/header-logo.svg"
              alt="Bridge Logo"
            />
          </div>
        </div>
        <div className="pl-1 flex-row justify-between">
          <div className="flex flex-row">
            <div className="font-semibold">Version {data?.v ?? "0.0.0"}</div>
            <span className="mx-2">|</span>
            <a
              href="https://status.quantumbridge.app"
              target="_blank"
              rel="noreferrer"
              className="pb-2 md:pb-0 pr-2 mr-2"
            >
              Status
            </a>
          </div>
          <div>
            Quantum is a proud development of Birthday Research — the blockchain
            R&D arm of Cake Group
          </div>
          <div className="flex flex-row justify-between pt-[19px] md:pt-[26px] lg:pt-2 items-end md:items-start">
            <div className="flex flex-col md:flex-row md:items-end">
              <a
                href="https://birthday.dev"
                target="_blank"
                rel="noreferrer"
                className="pb-2 md:pb-0 pr-2"
              >
                &copy; {new Date().getFullYear()} Birthday Research
              </a>
              <Socials items={BirthdayResearchSocialItems} />
            </div>
            <div className="md:flex md:flex-row-reverse lg:flex-col lg:items-end lg:pt-0 text-right">
              <a
                href="https://defichain.com"
                target="_blank"
                rel="noreferrer"
                className="pb-2 md:pl-2 md:pb-0 lg:relative lg:bottom-[28px] lg:h-0"
              >
                &copy; DeFiChain
              </a>
              <Socials
                items={DeFiChainSocialItems}
                containerStyle="pt-2 md:pt-0"
              />
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}
