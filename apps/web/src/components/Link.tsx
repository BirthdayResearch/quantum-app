/* eslint-disable no-restricted-imports */
import { LinkProps as NextLinkProps } from "next/dist/client/link";
import { useRouter } from "next/router";
import NextLink from "next/link";
import { PropsWithChildren } from "react";
import { UrlObject } from "url";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";

export interface LinkUrlObject extends UrlObject {
  query?: Record<string, string>;
}

interface LinkProps extends NextLinkProps {
  href: LinkUrlObject;
}

/**
 * Overrides the default next/link to provide ability to 'keep ?network= query string'.
 * This allows `<Link>` usage to be network agnostic where ?network= are automatically appended.
 *
 * To keep implementation simple, LinkProps enforce href to be strictly a `UrlObject` object
 * where query is a `Record<string, string>`. Hence only use this for internal linking.
 *
 * @param {PropsWithChildren<LinkProps>} props
 */
export function Link(props: PropsWithChildren<LinkProps>): JSX.Element {
  const { children, href } = props;
  const router = useRouter();
  const networkQuery = router.query.network;

  const { networkEnv } = useNetworkEnvironmentContext();
  if (networkQuery) {
    href.query = {
      ...(href.query ?? {}),
      network: networkEnv,
    };
  }

  return (
    <NextLink passHref {...props} legacyBehavior>
      {children}
    </NextLink>
  );
}
