import React from "react";
import { useNavigate } from "react-router-dom";
import "../pages/feed.css";
import { useSelector } from "react-redux";

function VideoCard(props) {
  const pageRoute = useNavigate();
  const { darkMode } = useSelector((state) => state.darkMode);

  return (
    <div
      style={{ width: props.width, display: props.display }}
      className="w-[100%] sm:w-[90%] md:w-[100%] relative cursor-pointer videoComponent"
    >
      <img
        onClick={() => pageRoute(`/watch/${props.videoId}`)}
        className="w-full rounded-[12px] videoImage object-cover"
        src={props.thumbnail}
        alt={props.title}
        style={{ aspectRatio: "16/9" }}
      />
      <div
        style={{ width: props.rightWidth }}
        className="flex w-[100%] gap-x-3 items-start mt-2"
      >
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-white text-xs font-bold">Y</span>
        </div>
        <div className="flex-1">
          <h3
            onClick={() => pageRoute(`/watch/${props.videoId}`)}
            className={`text-[14px] lg:text-[15px] font-semibold leading-[20px] w-[94%] ${darkMode ? "text-white" : "text-[#0f0f0f]"
              }`}
          >
            {props.title?.slice(0, 60)}
          </h3>
          <div className="mt-1">
            <p className="text-[12px] text-[#606060] font-[500] tracking-wide">
              {props.channel}
            </p>
            <p className="text-[12px] text-[#606060] font-medium tracking-wider -mt-1">
              {props.on || props.publishedAt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
