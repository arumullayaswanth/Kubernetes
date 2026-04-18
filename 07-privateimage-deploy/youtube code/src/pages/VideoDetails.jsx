import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactPlayer from "react-player";
import { useSelector } from "react-redux";
import { videos, shorts } from "../utils/videos";

const RelatedVideo = ({ videoId, title, thumbnail, channel, publishedAt }) => {
  const pageRoute = useNavigate();
  return (
    <div
      className="flex flex-col sm:flex-row w-[98%] sm:w-[90%] sm:items-start gap-x-4 cursor-pointer"
      onClick={() => pageRoute(`/watch/${videoId}`)}
    >
      <img
        alt={title}
        className="w-[100%] sm:w-[210px] sm:h-[110px] bg-cover rounded-[8px]"
        src={thumbnail}
      />
      <div>
        <h3 className="text-[14px] md:text-[15px] font-medium tracking-wide text-[#000000] md:leading-[22px] w-[100%] sm:w-[110%]">
          {title?.slice(0, 60)}
        </h3>
        <p className="text-[#606060] text-[12px] font-[500] tracking-wide mt-1">
          {channel}
        </p>
        <p className="text-[#606060] text-[12px] font-medium tracking-wider">
          {publishedAt}
        </p>
      </div>
    </div>
  );
};

function VideoDetails() {
  const { sidebarExtend } = useSelector((state) => state.category);
  const { darkMode } = useSelector((state) => state.darkMode);
  const { id } = useParams();

  const currentVideo = videos.find((v) => v.videoId === id) || videos[0];
  const relatedVideos = videos.filter((v) => v.videoId !== id);

  useEffect(() => {
    document.title = currentVideo?.title || "Watch - Youtube";
  }, [id]);

  return (
    <>
      <div
        className={`sm:hidden overlayEffect ${sidebarExtend ? "block" : "hidden"
          }`}
      ></div>

      <div
        className={`pl-0 ${sidebarExtend ? "sm:pl-[180px]" : "sm:pl-[70px]"
          } pt-20 ml-4 lg:flex lg:gap-x-7`}
      >
        {/* Video Player */}
        <div className="w-[96%] lg:max-w-[850px]">
          <div className="h-[240px] sm:h-[320px] lg:h-[480px]">
            <ReactPlayer
              width="100%"
              height="100%"
              url={`https://www.youtube.com/watch?v=${id}`}
              controls
              playing
            />
          </div>

          <div className="mt-4">
            <h2
              className={`text-md sm:text-xl md:text-2xl font-medium ${darkMode ? "text-white" : "text-black"
                }`}
            >
              {currentVideo?.title}
            </h2>
            <div className="flex items-center gap-x-3 mt-3">
              <span
                className={`text-sm font-medium px-3 py-2 rounded-[10px] ${darkMode ? "bg-[#272727] text-white" : "bg-[#f2f2f2] text-black"
                  }`}
              >
                {currentVideo?.channel}
              </span>
              <span
                className={`text-sm font-medium px-3 py-2 rounded-[10px] ${darkMode ? "bg-[#272727] text-white" : "bg-[#f2f2f2] text-black"
                  }`}
              >
                {currentVideo?.publishedAt}
              </span>
            </div>
          </div>
        </div>

        {/* Related Videos */}
        <div className="flex flex-col gap-y-4 mt-8 lg:mt-0 w-[96%] lg:w-[380px]">
          <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-black"}`}>
            Related Videos
          </h3>
          {relatedVideos.map((video, index) => (
            <RelatedVideo key={index} {...video} />
          ))}
        </div>
      </div>
    </>
  );
}

export default VideoDetails;
