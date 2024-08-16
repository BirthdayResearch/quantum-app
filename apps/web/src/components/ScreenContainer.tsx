import Footer from "@components/Footer";
import Header from "@components/Header";
import clsx from "clsx";
import { useRouter } from "next/router";
import Maintenance from "./Maintenance";

export default function ScreenContainer({
  children,
  isBridgeUp,
}: {
  children: JSX.Element;
  isBridgeUp: boolean;
}): JSX.Element {
  const router = useRouter();
  const is404 = router.pathname === "/404";
  // background picture has 2 conditions/designs: connected wallet bg design vs preconnected wallet bg design
  const bgPicture =
    !isBridgeUp || is404
      ? "bg-[url('/background/error_mobile.png')] md:bg-[url('/background/error_tablet.png')] lg:bg-[url('/background/error_desktop.png')]"
      : "bg-[url('/background/mobile.webp')] md:bg-[url('/background/tablet.webp')] lg:bg-[url('/background/desktop.webp')]";

  return (
    <div className="relative min-h-screen flex flex-col">
      <Header isBridgeUp={isBridgeUp} />
      <div className="relative z-[1] flex-grow md:pb-12 lg:pb-20">
        <div>
          {isBridgeUp || is404 ? <main>{children}</main> : <Maintenance />}
        </div>
      </div>
      <div
        className={clsx(
          "absolute top-0 left-0 z-auto h-full w-full bg-cover bg-local bg-clip-padding bg-top bg-no-repeat bg-origin-padding mix-blend-screen lg:bg-top",
          bgPicture,
        )}
      />
      <Footer />
    </div>
  );
}
