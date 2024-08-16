import Link from "next/link";
import { IconType } from "react-icons";
import { FiBook, FiHelpCircle } from "react-icons/fi";

interface MenuListItem {
  id: string;
  title: string;
  href: string;
  icon: IconType;
}

export default function MobileBottomMenu() {
  const menuList: MenuListItem[] = [
    {
      id: "faqs",
      title: "FAQs",
      href: "https://birthday-research.gitbook.io/quantum-documentation/troubleshooting/faqs",
      icon: FiHelpCircle,
    },
    {
      id: "documentation",
      title: "Documentation",
      href: "https://birthday-research.gitbook.io/quantum-documentation/",
      icon: FiBook,
    },
  ];

  return (
    <nav>
      <ul className="grid grid-cols-2 gap-2 mb-1">
        {menuList.map(({ icon: Icon, ...item }) => (
          <li key={item.title}>
            <Link
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex flex-col items-center gap-2 cursor-pointer focus-visible:outline-none hover:opacity-70"
            >
              <Icon size={28} className="text-dark-900" />
              <span className="text-xs font-semibold text-dark-900">
                {item.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
