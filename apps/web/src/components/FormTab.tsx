import clsx from "clsx";
import React, { Dispatch, SetStateAction } from "react";
import { FormOptions, useNetworkContext } from "@contexts/NetworkContext";

function Tab({
  label,
  activeTab,
  setActiveTab,
}: {
  label: FormOptions;
  activeTab: FormOptions;
  setActiveTab: Dispatch<SetStateAction<FormOptions>>;
}) {
  const { setTypeOfTransaction } = useNetworkContext();
  function setFormTransactionType(formTabOptions: FormOptions) {
    setTypeOfTransaction(
      FormOptions.INSTANT === formTabOptions
        ? FormOptions.INSTANT
        : FormOptions.QUEUE,
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setActiveTab(label);
        setFormTransactionType(label);
      }}
      className={clsx(
        "py-[17px] relative border-dark-200 w-full",
        label === FormOptions.INSTANT ? "border-r-[0.5px]" : "border-l-[0.5px]",
      )}
    >
      <span
        className={clsx(
          "text-dark-900 font-semibold lg:text-[14px] lg:leading-4 text-xs",
        )}
      >
        {label}
      </span>
      <div
        data-testid={`${activeTab}-tab-highlight`}
        className={clsx("h-px w-full absolute z-10 -bottom-px", {
          "fill-bg-gradient-1": activeTab === label,
        })}
      />
    </button>
  );
}

export default function FormTab({
  activeTab,
  setActiveTab,
}: {
  activeTab: FormOptions;
  setActiveTab: Dispatch<SetStateAction<FormOptions>>;
}) {
  return (
    <section
      data-testid="form-tab"
      className={clsx(
        "flex flex-row justify-evenly dark-card-bg-image backdrop-blur-[18px]",
        "border border-dark-200 md:rounded-t-[20px] rounded-t-[15px]",
        "lg:w-full md:w-[calc(100%+2px)] w-full",
      )}
    >
      <Tab
        data-testid="instant-tab"
        label={FormOptions.INSTANT}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <Tab
        data-testid="queue-tab"
        label={FormOptions.QUEUE}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </section>
  );
}
