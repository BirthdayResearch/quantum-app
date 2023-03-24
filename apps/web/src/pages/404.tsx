import { useRouter } from "next/router";
import clsx from "clsx";
import ActionButton from "@components/commons/ActionButton";

function Page404() {
  const router = useRouter();
  return (
    <section
      className={clsx(
        "min-h-screen px-6 pt-8",
        "md:w-9/12 lg:w-10/12 md:px-12",
        "lg:px-[120px]"
      )}
      data-testid="page-not-found"
    >
      <div
        className={clsx(
          "md:text-[16px] leading-4 text-error tracking-[0.04em] pb-2"
        )}
      >
        ERROR 404
      </div>
      <h1
        className={clsx(
          "text-dark-1000 text-4xl pb-6",
          "lg:text-[80px] lg:leading-[84px]"
        )}
      >
        Page Not Found
      </h1>
      <p className="text-dark-700 leading-7 sm:text-xl w-10/12 lg:w-6/12">
        The page you are looking for might have been changed or removed. Make
        sure the URL that you entered is correct.
      </p>
      <div className={clsx("pt-6 w-8/12", "md:pt-12 md:w-8/12 lg:w-[300px]")}>
        <ActionButton label="Return to home" onClick={() => router.push("/")} />
      </div>
    </section>
  );
}

export default Page404;
