import { FaReddit, FaGithub, FaTwitter } from "react-icons/fa";

export const SocialItems = [
  {
    icon: FaTwitter,
    testId: "twitter",
    label: "Twitter (Birthday Research)",
    href: "https://twitter.com/BirthdayDev",
  },
  {
    icon: FaGithub,
    testId: "gitHub",
    label: "GitHub (Birthday Research)",
    href: "https://github.com/BirthdayResearch",
  },
  {
    icon: FaReddit,
    testId: "reddit",
    label: "Reddit (r/defiblockchain)",
    href: "https://www.reddit.com/r/defiblockchain",
  },
];

export default function Maintenance(): JSX.Element {
  return (
    <div
      className="mx-0 min-h-[60vh] lg:min-h-[50vh]"
      data-testid="maintenance"
    >
      <div className="flex flex-col md:flex-row w-full md:px-[40px] lg:px-[120px]">
        <div className="flex flex-col justify-between px-6 pb-6 md:px-0 md:pb-0 md:mr-8 lg:mr-[72px]">
          <div>
            <div className="md:text-[16px] leading-4 text-error tracking-[0.04em] pb-2">
              SCHEDULED MAINTENANCE
            </div>
            <h1
              data-testid="maintenance_title"
              className="text-dark-1000 xs:text-[36px] xs:leading-10 xs:w-11/12 md:w-7/12 md:text-[52px] md:leading-[52px] lg:text-[52px] lg:leading-[52px]"
            >
              Bridge is currently closed
            </h1>
            <div className="pt-2 pb-12">
              <div className="align-middle text-base text-dark-700 lg:text-xl md:w-7/12">
                There are regular checks to maintain performance standards on
                the Bridge. Please try again after some time. For any immediate
                concerns or status updates, consult the following links:
              </div>
            </div>
            <div className="flex flex-col space-y-6 md:mt-5 text-dark-900">
              {SocialItems.map(({ label, href, testId, icon: Icon }) => (
                <a
                  href={href}
                  key={testId}
                  target="_blank"
                  rel="noreferrer"
                  className=""
                  data-testid={testId}
                >
                  <div className="flex flex-row items-center">
                    <Icon size={18} />
                    <span className="ml-4 text-base">{label}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
