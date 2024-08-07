import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FiArrowUpRight } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { satisfies } from "semver";
import { RootState } from "@store/reducers/rootReducer";
import { selectVersion } from "@store/slices/versionSlice";
import { useLazyBridgeAnnouncements } from "@store/index";
import { BridgeAnnouncement } from "types";
import { getStorageItem, setStorageItem } from "@utils/localStorage";

const HIDDEN_ANNOUNCEMENTS_KEY = "hidden-announcements";

export default function AnnouncementBanner() {
  const appVersion = useSelector((state: RootState) => selectVersion(state));
  const [trigger] = useLazyBridgeAnnouncements();
  const [announcement, setAnnouncement] = useState<{
    id: string;
    content: string;
    url?: string;
  }>();
  const [hiddenAnnouncements, setHiddenAnnouncements] = useState<string[]>(
    getStorageItem(HIDDEN_ANNOUNCEMENTS_KEY) ?? [],
  );

  async function getAnnouncements() {
    const { data } = await trigger({});
    const announcementData: BridgeAnnouncement | undefined = data?.find(
      ({ version }) => satisfies(appVersion, version),
    );
    if (announcementData) {
      setAnnouncement({
        id: announcementData.id,
        content: announcementData.lang.en,
        url: announcementData.url,
      });
    }
  }

  useEffect(() => {
    getAnnouncements();
  }, []);

  const onHideAnnouncement = () => {
    if (announcement === undefined || announcement.id === undefined) {
      return;
    }
    const updatedHiddenAnnouncements = [
      ...hiddenAnnouncements,
      announcement.id,
    ];
    setStorageItem(HIDDEN_ANNOUNCEMENTS_KEY, updatedHiddenAnnouncements);
    setHiddenAnnouncements(updatedHiddenAnnouncements);
  };

  const showAnnouncement =
    announcement && !hiddenAnnouncements.includes(announcement.id);

  return showAnnouncement ? (
    <div
      data-testid="announcement_banner"
      className="flex flex-row justify-between items-center py-[18px] px-6 md:px-10 lg:px-[120px] bg-dark-gradient-4"
    >
      <div className="flex items-center text-dark-00 text-xs lg:text-sm">
        <span>
          {announcement.content}
          {announcement.url && (
            <Link href={announcement.url} target="_blank">
              <FiArrowUpRight size={20} className="inline shrink-0 ml-2" />
            </Link>
          )}
        </span>
      </div>
      <IoClose
        size={20}
        className="shrink-0 cursor-pointer ml-6"
        onClick={() => onHideAnnouncement()}
      />
    </div>
  ) : null;
}
