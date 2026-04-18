import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import videos from "../utils/videos";

function SearchFeed() {
  const { id } = useParams();
  const { sidebarExtend } = useSelector((state) => state.category);
  const { darkMode } = useSelector((state) => state.darkMode);
  const pageRoute = useNavigate();
  const [results, setResults] = useState([]);

  useEffect(() => {
    document.title = `${id} - YouTube Search`;
    if (id) {
      const filtered = videos.filter(
        (v) =>
          v.title.toLowerCase().includes(id.toLowerCase()) ||
          v.channel.toLowerCase().includes(id.toLowerCase())
      );
      setResults(filtered.length > 0 ? filtered : videos);
    }
  }, [id]);

  return (
    <>
      <div
        className={`sm:hidden overlayEffect ${sidebarExtend ? "block" : "hidden"
          }`}
      ></div>
      <div
        className={`pl-0 ${sidebarExtend ? "sm:pl-[180px]" : "sm:pl-[70px]"
          } pt-20 ml-4 w-[100%] flex flex-col gap-y-5 pr-4`}
      >
        <h3
          className={`text-lg font-medium ${darkMode ? "text-white" : "text-black"
            }`}
        >
          Search results for: "{id}"
        </h3>
        {results.map((video, index) => (
          <div
            key={index}
            className="flex flex-col gap-y-3 sm:flex-row gap-x-4 md:gap-x-8 w-[98%] cursor-pointer"
          >
            <img
              onClick={() => pageRoute(`/watch/${video.videoId}`)}
              className="w-[97%] sm:w-[29%] md:w-[25%] rounded-[12px]"
              src={video.thumbnail}
              alt={video.title}
              style={{ aspectRatio: "16/9", objectFit: "cover" }}
            />
            <div className="w-[92%] sm:w-[60%] md:w-[70%] lg:w-[60%]">
              <h3
                onClick={() => pageRoute(`/watch/${video.videoId}`)}
                className={`text-md sm:text-lg md:text-xl font-normal leading-[22px] md:leading-[26px] ${darkMode ? "text-white" : "text-[#0f0f0f]"
                  }`}
              >
                {video.title}
              </h3>
              <p className="text-[#606060] text-[12px] mt-1">
                {video.publishedAt}
              </p>
              <h4 className="font-medium text-[#606060] text-[13px] my-1">
                {video.channel}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default SearchFeed;
