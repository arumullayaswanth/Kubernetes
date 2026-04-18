import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { videos } from "../utils/videos";

function ChannelDetails() {
  const { sidebarExtend } = useSelector((state) => state.category);
  const { darkMode } = useSelector((state) => state.darkMode);
  const pageRoute = useNavigate();

  return (
    <>
      <div
        className={`sm:hidden overlayEffect ${sidebarExtend ? "block" : "hidden"
          }`}
      ></div>

      <div
        className={`pt-14 ml-4 pl-0 ${sidebarExtend ? "sm:pl-[180px]" : "sm:pl-[70px]"
          }`}
      >
        {/* Channel Banner */}
        <div
          className="w-[100%] h-[120px] sm:h-[160px] lg:h-[200px] rounded-[12px]"
          style={{
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
        />

        {/* Channel Info */}
        <div className="flex gap-x-5 items-center my-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl font-bold">Y</span>
          </div>
          <div className="flex flex-col">
            <h3
              className={`text-xl md:text-2xl font-semibold tracking-wide ${darkMode ? "text-white" : "text-black"
                }`}
            >
              Yaswanth Arumulla
            </h3>
            <span className="text-[13px] tracking-wide font-[500] text-[#606060]">
              @yaswantharumulla
            </span>
            <span className="text-[13px] tracking-wider font-[500] text-[#606060]">
              DevOps • AWS • Kubernetes • CI/CD
            </span>
          </div>
        </div>

        {/* Videos */}
        <div>
          <h4
            className={`text-[16px] font-bold tracking-wider mb-3 ${darkMode ? "text-white" : "text-[#585858]"
              }`}
          >
            VIDEOS
          </h4>
          <div className="flex flex-wrap gap-x-5 gap-y-5">
            {videos.map((video, index) => (
              <div
                key={index}
                className="cursor-pointer"
                style={{ width: "210px" }}
                onClick={() => pageRoute(`/watch/${video.videoId}`)}
              >
                <img
                  className="w-[210px] h-[118px] rounded-[8px] object-cover"
                  src={video.thumbnail}
                  alt={video.title}
                />
                <h3
                  className={`text-[13px] font-medium mt-1 leading-[18px] ${darkMode ? "text-white" : "text-[#0f0f0f]"
                    }`}
                >
                  {video.title?.slice(0, 50)}...
                </h3>
                <p className="text-[#606060] text-[11px] mt-1">
                  {video.publishedAt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default ChannelDetails;
