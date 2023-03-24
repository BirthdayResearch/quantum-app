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
      href: "https://birthdayresearch.notion.site/FAQs-58af5cc140de432e8c9d1510ead3e3c0",
      icon: FiHelpCircle,
    },
    {
      id: "documentation",
      title: "Documentation",
      href: "https://birthdayresearch.notion.site/birthdayresearch/Quantum-Documentation-dc1d9174dd294b06833e7859d437e25e",
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
