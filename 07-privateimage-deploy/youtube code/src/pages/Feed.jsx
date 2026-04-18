import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import videos from "../utils/videos";
import "./feed.css";

function VideoCard({ videoId, title, thumbnail, channel, publishedAt }) {
  const pageRoute = useNavigate();
  const { darkMode } = useSelector((state) => state.darkMode);

  return (
    <div className="w-[100%] sm:w-[90%] md:w-[100%] relative cursor-pointer videoComponent">
      <img
        onClick={() => pageRoute(`/watch/${videoId}`)}
        className="w-full rounded-[12px] videoImage object-cover"
        src={thumbnail}
        alt={title}
        style={{ aspectRatio: "16/9" }}
      />
      <div className="flex w-[100%] gap-x-3 items-start mt-2">
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-white text-xs font-bold">Y</span>
        </div>
        <div className="flex-1">
          <h3
            onClick={() => pageRoute(`/watch/${videoId}`)}
            className={`text-[14px] lg:text-[15px] font-semibold leading-[20px] w-[94%] ${darkMode ? "text-white" : "text-[#0f0f0f]"
              }`}
          >
            {title?.slice(0, 65)}
            {title?.length > 65 ? "..." : ""}
          </h3>
          <div className="mt-1">
            <p className="text-[12px] text-[#606060] font-[500] tracking-wide hover:text-black cursor-pointer">
              {channel}
            </p>
            <p className="text-[12px] text-[#606060] font-medium tracking-wider">
              {publishedAt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feed() {
  const { id } = useParams();
  const { sidebarExtend } = useSelector((state) => state.category);
  const { darkMode } = useSelector((state) => state.darkMode);
  const [filteredVideos, setFilteredVideos] = useState(videos);

  useEffect(() => {
    document.title = id ? `${id} - YouTube` : "Home - YouTube";
    document.body.style.backgroundColor = darkMode ? "#0f0f0f" : "#fff";

    if (id && id !== "Home") {
      const filtered = videos.filter(
        (v) =>
          v.title.toLowerCase().includes(id.toLowerCase()) ||
          v.channel.toLowerCase().includes(id.toLowerCase())
      );
      setFilteredVideos(filtered.length > 0 ? filtered : videos);
    } else {
      setFilteredVideos(videos);
    }
  }, [id, darkMode]);

  return (
    <>
      <div
        className={`sm:hidden overlayEffect ${sidebarExtend ? "block" : "hidden"
          }`}
      ></div>
      <div
        className={`pl-0 ${sidebarExtend ? "sm:pl-[180px]" : "sm:pl-[70px]"
          } feedGrid grid sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-x-[4%] pt-20 mx-3 sm:ml-4 md:pr-[28px] lg:pr-14 gap-y-6 max-w-[100%]`}
      >
        {filteredVideos.map((video, index) => (
          <VideoCard key={index} {...video} />
        ))}
      </div>
    </>
  );
}

export default Feed;
