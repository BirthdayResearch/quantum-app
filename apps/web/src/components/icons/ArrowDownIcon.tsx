interface ArrowDownIconProps {
  className: string;
  size: number;
}

export default function ArrowDownIcon({
  className,
  size = 24,
}: ArrowDownIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13 6C13 5.44772 12.5523 5 12 5C11.4477 5 11 5.44772 11 6V17.5858L5.70711 12.2929C5.31658 11.9024 4.68342 11.9024 4.29289 12.2929C3.90237 12.6834 3.90237 13.3166 4.29289 13.7071L11.292 20.7063C11.2945 20.7087 11.297 20.7112 11.2995 20.7136C11.3938 20.8063 11.502 20.8764 11.6172 20.9241C11.7343 20.9727 11.8625 20.9996 11.997 21C11.998 21 11.999 21 12 21C12.001 21 12.002 21 12.003 21C12.1375 20.9996 12.2657 20.9727 12.3828 20.9241C12.5007 20.8753 12.6112 20.803 12.7071 20.7071L19.7071 13.7071C20.0976 13.3166 20.0976 12.6834 19.7071 12.2929C19.3166 11.9024 18.6834 11.9024 18.2929 12.2929L13 17.5858V6Z"
        className={className}
      />
    </svg>
  );
}
