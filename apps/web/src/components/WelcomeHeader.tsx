import clsx from "clsx";
import Link from "next/link";
import { FiBook } from "react-icons/fi";
import { RiQuestionFill } from "react-icons/ri";

export default function WelcomeHeader() {
  const headerStyle =
    "text-[32px] leading-9 md:w-full lg:leading-[52px] text-dark-1000 lg:text-[52px]";
  const bylineStyle =
    "align-middle text-base text-dark-1000 lg:leading-10 lg:text-[32px] text-xl";
  const underText =
    "ml-2 lg:text-xl md:text-sm font-bold text-dark-900 hover:text-dark-500";
  return (
    <div>
      <h1 className={clsx(headerStyle)}>Building a</h1>
      <h1 className={clsx(headerStyle)}>decentralized</h1>
      <h1 className={clsx(headerStyle)}>tomorrow</h1>
      <div className="mt-2 lg:mt-3">
        <h2 className={clsx(bylineStyle)}>connecting one</h2>
        <h2 className={clsx(bylineStyle)}>blockchain at a time</h2>
        <div className="flex flex-row items-center xs:mt-[36px] md:mt-7 hidden md:inline-flex">
          <Link
            href="https://birthday-research.gitbook.io/quantum-documentation/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-row items-center group"
          >
            <FiBook
              size={20}
              className="text-dark-900 group-hover:text-dark-500"
            />
            <span className={clsx(underText)}>Documentation</span>
          </Link>
          <Link
            href="https://birthday-research.gitbook.io/quantum-documentation/troubleshooting/faqs"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-6 flex flex-row items-center group"
          >
            <RiQuestionFill
              size={20}
              className="text-dark-900 group-hover:text-dark-500"
            />
            <span className={clsx(underText)}>FAQs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
