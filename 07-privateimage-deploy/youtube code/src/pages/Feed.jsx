import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { videos, shorts } from "../utils/videos";
import "./feed.css";

const chips = [
  "All", "DevOps", "Kubernetes", "AWS", "Docker", "CI/CD",
  "Terraform", "ArgoCD", "Jenkins", "Microservices", "Security",
  "Serverless", "EKS", "ECS", "Lambda", "S3", "RDS", "AI",
];

function VideoCard({ videoId, title, thumbnail, channel, publishedAt }) {
  const pageRoute = useNavigate();
  const { darkMode } = useSelector((state) => state.darkMode);

  return (
    <div className="w-[100%] relative cursor-pointer">
      <img
        onClick={() => pageRoute(`/watch/${videoId}`)}
        className="w-full rounded-[12px] object-cover"
        src={thumbnail}
        alt={title}
        style={{ aspectRatio: "16/9" }}
      />
      <div className="flex gap-x-3 items-start mt-2">
        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">Y</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3
            onClick={() => pageRoute(`/watch/${videoId}`)}
            className={`text-[14px] font-semibold leading-[20px] line-clamp-2 ${darkMode ? "text-white" : "text-[#0f0f0f]"
              }`}
          >
            {title}
          </h3>
          <p className="text-[12px] text-[#606060] mt-1">{channel}</p>
          <p className="text-[12px] text-[#606060]">{publishedAt}</p>
        </div>
        <button className="text-[#606060] flex-shrink-0 mt-1">⋮</button>
      </div>
    </div>
  );
}

function ShortCard({ videoId, title, thumbnail, channel }) {
  const pageRoute = useNavigate();

  return (
    <div
      className="cursor-pointer flex-shrink-0"
      style={{ width: "168px" }}
      onClick={() => pageRoute(`/watch/${videoId}`)}
    >
      <div className="relative">
        <img
          className="w-[168px] h-[300px] rounded-[12px] object-cover"
          src={thumbnail}
          alt={title}
        />
      </div>
      <h3 className="text-[13px] font-semibold mt-2 leading-[18px] text-[#0f0f0f] line-clamp-2">
        {title}
      </h3>
      <p className="text-[11px] text-[#606060] mt-1">{channel}</p>
    </div>
  );
}

function Feed() {
  const { id } = useParams();
  const { sidebarExtend } = useSelector((state) => state.category);
  const { darkMode } = useSelector((state) => state.darkMode);
  const [filteredVideos, setFilteredVideos] = useState(videos);
  const [activeChip, setActiveChip] = useState("All");

  useEffect(() => {
    document.title = id ? `${id} - YouTube` : "Home - YouTube";
    document.body.style.backgroundColor = darkMode ? "#0f0f0f" : "#fff";
  }, [darkMode]);

  useEffect(() => {
    if (id && id !== "Home") {
      const filtered = videos.filter(
        (v) =>
          v.title.toLowerCase().includes(id.toLowerCase()) ||
          v.channel.toLowerCase().includes(id.toLowerCase())
      );
      setFilteredVideos(filtered.length > 0 ? filtered : videos);
      setActiveChip(id);
    } else {
      setFilteredVideos(videos);
      setActiveChip("All");
    }
  }, [id]);

  const handleChip = (chip) => {
    setActiveChip(chip);
    if (chip === "All") {
      setFilteredVideos(videos);
    } else {
      const filtered = videos.filter((v) =>
        v.title.toLowerCase().includes(chip.toLowerCase())
      );
      setFilteredVideos(filtered.length > 0 ? filtered : videos);
    }
  };

  return (
    <>
      <div className={`sm:hidden overlayEffect ${sidebarExtend ? "block" : "hidden"}`}></div>

      {/* Category chips — fixed below navbar */}
      <div
        className={`fixed top-[56px] z-10 w-full pl-[72px] pr-4 py-3 flex gap-x-3 overflow-x-auto
          ${darkMode ? "bg-[#0f0f0f]" : "bg-white"}`}
        style={{ scrollbarWidth: "none" }}
      >
        {chips.map((chip, i) => (
          <button
            key={i}
            onClick={() => handleChip(chip)}
            className={`flex-shrink-0 px-3 py-1 rounded-[8px] text-[14px] font-medium transition-colors
              ${activeChip === chip
                ? darkMode
                  ? "bg-white text-black"
                  : "bg-[#0f0f0f] text-white"
                : darkMode
                  ? "bg-[#272727] text-white hover:bg-[#3f3f3f]"
                  : "bg-[#f2f2f2] text-[#0f0f0f] hover:bg-[#e5e5e5]"
              }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div
        className={`pl-[72px] pt-[108px] px-4 max-w-[100%]`}
      >
        {/* Shorts Section */}
        {activeChip === "All" && (
          <div className="mb-8">
            <h2 className={`text-[18px] font-bold mb-4 flex items-center gap-x-2 ${darkMode ? "text-white" : "text-[#0f0f0f]"}`}>
              <span className="text-red-600 text-xl">▶</span> Shorts
            </h2>
            <div className="flex gap-x-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {shorts.map((short, index) => (
                <ShortCard key={index} {...short} />
              ))}
            </div>
          </div>
        )}

        {/* Videos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {filteredVideos.map((video, index) => (
            <VideoCard key={index} {...video} />
          ))}
        </div>
      </div>
    </>
  );
}

export default Feed;
