import clsx from "clsx";
import { IconType } from "react-icons";

interface SocialsProps {
  items: { icon: IconType; testId: string; label: string; href: string }[];
  containerStyle?: string;
}

export default function Socials(props: SocialsProps): JSX.Element {
  const { items, containerStyle } = props;
  return (
    <div className={clsx("flex flex-row space-x-3.5", containerStyle)}>
      {items.map(({ href, testId, icon: Icon }) => (
        <a
          href={href}
          key={testId}
          target="_blank"
          rel="noreferrer"
          className=""
          data-testid={`${testId}`}
          aria-label={`${testId} Icon`}
        >
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}
