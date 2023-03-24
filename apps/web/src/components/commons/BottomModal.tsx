import { Fragment, PropsWithChildren } from "react";
import { FiXCircle } from "react-icons/fi";
import { Dialog, Transition } from "@headlessui/react";
import useDisableEscapeKey from "@hooks/useDisableEscapeKey";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function BottomModal({
  isOpen,
  onClose,
  children,
  title = "",
}: PropsWithChildren<Props>) {
  useDisableEscapeKey(isOpen);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-100"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Dialog.Panel className="transform transition-all fixed inset-0 bg-dark-00 bg-opacity-1">
            <div className="absolute bottom-0 w-full border border-dark-card-stroke rounded-t-xl backdrop-blur-[18px] bg-dark-00 p-6 pt-8">
              <Dialog.Title
                as="div"
                className="flex items-center justify-between text-lg font-medium leading-6 text-gray-900"
              >
                <h3 className="text-xl font-bold text-dark-900">{title}</h3>
                <FiXCircle
                  size={24}
                  className="text-dark-900 cursor-pointer hover:opacity-70"
                  onClick={onClose}
                />
              </Dialog.Title>
              {children}
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}
