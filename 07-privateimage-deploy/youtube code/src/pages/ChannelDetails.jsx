import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { videos } from "../utils/videos";
import bannerImg from "../images/channels4_banner.jpg";
import profileImg from "../images/channels4_profile.jpg";

function ChannelDetails() {
  const { sidebarExtend } = useSelector((state) => state.category);
  const { darkMode } = useSelector((state) => state.darkMode);
  const pageRoute = useNavigate();
  const [activeTab, setActiveTab] = useState("Videos");
  const [showAbout, setShowAbout] = useState(false);

  const tabs = ["Videos", "Shorts", "Playlists", "About"];
  const textColor = darkMode ? "text-white" : "text-[#0f0f0f]";
  const borderColor = darkMode ? "border-white" : "border-[#0f0f0f]";
  const bg = darkMode ? "bg-[#0f0f0f]" : "bg-white";

  return (
    <>
      <div className={`sm:hidden overlayEffect ${sidebarExtend ? "block" : "hidden"}`} />

      <div className={`pt-14 pl-[72px] ${bg} min-h-screen`}>

        {/* Channel Banner */}
        <div className="w-full h-[120px] sm:h-[160px] lg:h-[200px] overflow-hidden">
          <img
            src={bannerImg}
            alt="Channel Banner"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Channel Header */}
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-end gap-x-6 gap-y-4">
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex-shrink-0 -mt-10 sm:-mt-14 border-4 border-white">
            <img
              src={profileImg}
              alt="Channel Profile"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Channel Info */}
          <div className="flex-1">
            <h1 className={`text-2xl sm:text-3xl font-bold ${textColor}`}>
              Yash Academy
            </h1>
            <div className={`flex flex-wrap gap-x-3 text-[13px] mt-1 ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
              <span>@Yashacademy0</span>
              <span>•</span>
              <span>1.5K subscribers</span>
              <span>•</span>
              <span>{videos.length} videos</span>
            </div>
            <p className={`text-[13px] mt-1 ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
              Welcome to Yash Academy – your destination for mastering DevOps engineering, AWS cloud tools...
              <button
                onClick={() => setShowAbout(true)}
                className="text-[#0f0f0f] font-medium ml-1 hover:underline"
              >
                more
              </button>
            </p>
            <div className="flex gap-x-3 mt-3">
              <button className="bg-[#0f0f0f] text-white px-4 py-2 rounded-full text-[14px] font-medium hover:bg-[#272727]">
                Subscribe
              </button>
              <button className={`px-4 py-2 rounded-full text-[14px] font-medium ${darkMode ? "bg-[#272727] text-white hover:bg-[#3f3f3f]" : "bg-[#f2f2f2] text-[#0f0f0f] hover:bg-[#e5e5e5]"}`}>
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b px-6 ${darkMode ? "border-[#3f3f3f]" : "border-[#e5e5e5]"}`}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === "About") setShowAbout(true); }}
              className={`px-4 py-3 text-[14px] font-medium mr-2 border-b-2 transition-colors
                ${activeTab === tab
                  ? `${borderColor} ${textColor}`
                  : `border-transparent ${darkMode ? "text-[#aaa] hover:text-white" : "text-[#606060] hover:text-[#0f0f0f]"}`
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Videos Grid */}
        {activeTab === "Videos" && (
          <div className="px-6 py-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {videos.map((video, index) => (
              <div
                key={index}
                className="cursor-pointer"
                onClick={() => pageRoute(`/watch/${video.videoId}`)}
              >
                <img
                  className="w-full rounded-[8px] object-cover"
                  style={{ aspectRatio: "16/9" }}
                  src={video.thumbnail}
                  alt={video.title}
                />
                <h3 className={`text-[13px] font-medium mt-2 leading-[18px] line-clamp-2 ${textColor}`}>
                  {video.title}
                </h3>
                <p className={`text-[11px] mt-1 ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
                  {video.publishedAt}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* About Tab */}
        {activeTab === "About" && (
          <div className="px-6 py-6 max-w-[600px]">
            <h2 className={`text-[18px] font-bold mb-3 ${textColor}`}>Description</h2>
            <p className={`text-[14px] leading-[22px] ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
              Welcome to Yash Academy – your destination for mastering DevOps engineering, AWS cloud tools,
              and hands-on real-world projects. Whether you're a beginner or an experienced developer,
              we simplify tools like Docker, Kubernetes, Jenkins, Terraform, and GitHub Actions to help
              you grow your cloud career. Subscribe and start building today!
            </p>

            <h2 className={`text-[18px] font-bold mt-6 mb-3 ${textColor}`}>Links</h2>
            <div className="flex flex-col gap-y-3">
              <a href="https://linkedin.com/in/yaswanth-arumulla" target="_blank" rel="noreferrer"
                className="flex items-center gap-x-3">
                <div className="w-8 h-8 bg-[#0077b5] rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
                <div>
                  <p className={`text-[13px] font-medium ${textColor}`}>linkedin</p>
                  <p className="text-[13px] text-[#3ea6ff]">linkedin.com/in/yaswanth-arumulla</p>
                </div>
              </a>
              <a href="https://github.com/arumullayaswanth" target="_blank" rel="noreferrer"
                className="flex items-center gap-x-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${darkMode ? "bg-white" : "bg-[#0f0f0f]"}`}>
                  <span className={`text-sm font-bold ${darkMode ? "text-black" : "text-white"}`}>G</span>
                </div>
                <div>
                  <p className={`text-[13px] font-medium ${textColor}`}>Github</p>
                  <p className="text-[13px] text-[#3ea6ff]">github.com/arumullayaswanth</p>
                </div>
              </a>
              <a href="https://youtube.com/channel/UC-9zAR7fydsA0tiz_z9084Q" target="_blank" rel="noreferrer"
                className="flex items-center gap-x-3">
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">▶</span>
                </div>
                <div>
                  <p className={`text-[13px] font-medium ${textColor}`}>Youtube</p>
                  <p className="text-[13px] text-[#3ea6ff]">youtube.com/channel/UC-9zAR7fydsA0tiz_z9084Q</p>
                </div>
              </a>
            </div>

            <h2 className={`text-[18px] font-bold mt-6 mb-3 ${textColor}`}>More info</h2>
            <div className={`flex flex-col gap-y-3 text-[14px] ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
              <div className="flex items-center gap-x-3">
                <span>✉️</span>
                <span><span className="text-[#3ea6ff]">Sign in</span> to see email address</span>
              </div>
              <div className="flex items-center gap-x-3">
                <span>📞</span>
                <span>Phone verified ℹ️</span>
              </div>
              <div className="flex items-center gap-x-3">
                <span>▶️</span>
                <span>www.youtube.com/@Yashacademy0</span>
              </div>
              <div className="flex items-center gap-x-3">
                <span>🌐</span>
                <span>India</span>
              </div>
              <div className="flex items-center gap-x-3">
                <span>ℹ️</span>
                <span>Joined Dec 25, 2024</span>
              </div>
              <div className="flex items-center gap-x-3">
                <span>👥</span>
                <span>1.5K subscribers</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ChannelDetails;
