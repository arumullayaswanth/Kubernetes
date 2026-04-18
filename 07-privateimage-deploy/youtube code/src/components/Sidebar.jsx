import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "./Navbar";
import { setSidebarExtendedValue } from "../redux/categorySlice";
import { AiOutlineHome, AiFillHome } from "react-icons/ai";
import { MdOutlineSubscriptions, MdSubscriptions } from "react-icons/md";
import { BiHistory } from "react-icons/bi";
import { RiVideoLine } from "react-icons/ri";
import { BsCollectionPlay } from "react-icons/bs";
import { MdOutlineWatchLater } from "react-icons/md";
import { AiOutlineLike } from "react-icons/ai";
import { SiYoutubeshorts } from "react-icons/si";
import Menu from "../assets/Menu";
import logo from "../assets/ytLogo.png";
import logoDark from "../assets/ytLogo-dark.png";

function Sidebar() {
  const pageRoute = useNavigate();
  const dispatch = useDispatch();
  const [sidebarExtended, setSidebarExtended] = useState(false);
  const { darkMode } = useSelector((state) => state.darkMode);

  const bg = darkMode ? "#0f0f0f" : "#fff";
  const textColor = darkMode ? "text-white" : "text-[#0f0f0f]";
  const hoverBg = darkMode ? "hover:bg-[#272727]" : "hover:bg-[#f2f2f2]";

  const mainLinks = [
    { icon: <AiOutlineHome size={22} />, activeIcon: <AiFillHome size={22} />, label: "Home", path: "/" },
    { icon: <SiYoutubeshorts size={22} />, activeIcon: <SiYoutubeshorts size={22} />, label: "Shorts", path: "/" },
    { icon: <MdOutlineSubscriptions size={22} />, activeIcon: <MdSubscriptions size={22} />, label: "Subscriptions", path: "/" },
  ];

  const youLinks = [
    { icon: <RiVideoLine size={22} />, label: "Your videos", path: "/channel/yaswanth" },
    { icon: <MdOutlineWatchLater size={22} />, label: "Watch later", path: "/" },
    { icon: <AiOutlineLike size={22} />, label: "Liked videos", path: "/" },
    { icon: <BiHistory size={22} />, label: "History", path: "/" },
  ];

  return (
    <>
      <Navbar sidebarExtended={sidebarExtended} setSidebarExtended={setSidebarExtended} />

      {/* Desktop Sidebar */}
      <div
        style={{ backgroundColor: bg }}
        className={`hidden sm:flex flex-col fixed top-[56px] left-0 h-[calc(100vh-56px)] z-20 overflow-y-auto
          ${sidebarExtended ? "w-[240px]" : "w-[72px]"} transition-all duration-200`}
      >
        {/* Main links */}
        <div className="px-2 py-2">
          {mainLinks.map((item, i) => (
            <button
              key={i}
              onClick={() => pageRoute(item.path)}
              className={`w-full flex items-center gap-x-5 px-3 py-2 rounded-[10px] ${hoverBg} ${textColor}
                ${sidebarExtended ? "justify-start" : "justify-center flex-col gap-y-1"}`}
            >
              {item.icon}
              {sidebarExtended ? (
                <span className="text-[14px] font-medium">{item.label}</span>
              ) : (
                <span className="text-[10px]">{item.label}</span>
              )}
            </button>
          ))}
        </div>

        {sidebarExtended && (
          <>
            <hr className={`mx-3 my-2 ${darkMode ? "border-[#3f3f3f]" : "border-[#e5e5e5]"}`} />

            {/* You section */}
            <div className="px-2 py-1">
              <p className={`px-3 py-1 text-[16px] font-semibold ${textColor}`}>You</p>
              {youLinks.map((item, i) => (
                <button
                  key={i}
                  onClick={() => pageRoute(item.path)}
                  className={`w-full flex items-center gap-x-5 px-3 py-2 rounded-[10px] ${hoverBg} ${textColor}`}
                >
                  {item.icon}
                  <span className="text-[14px] font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <hr className={`mx-3 my-2 ${darkMode ? "border-[#3f3f3f]" : "border-[#e5e5e5]"}`} />

            {/* Sign in */}
            <div className="px-4 py-2">
              <p className={`text-[14px] ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
                Sign in to like videos, comment, and subscribe.
              </p>
              <button className="mt-3 flex items-center gap-x-2 border border-[#3ea6ff] text-[#3ea6ff] px-3 py-1 rounded-full text-[14px] font-medium hover:bg-[#263850]">
                <span>👤</span> Sign in
              </button>
            </div>

            <hr className={`mx-3 my-2 ${darkMode ? "border-[#3f3f3f]" : "border-[#e5e5e5]"}`} />

            {/* Explore */}
            <div className="px-2 py-1">
              <p className={`px-3 py-1 text-[16px] font-semibold ${textColor}`}>Explore</p>
              {["Trending", "Shopping", "Music", "Movies"].map((item, i) => (
                <button
                  key={i}
                  className={`w-full flex items-center gap-x-5 px-3 py-2 rounded-[10px] ${hoverBg} ${textColor}`}
                >
                  <BsCollectionPlay size={20} />
                  <span className="text-[14px] font-medium">{item}</span>
                </button>
              ))}
            </div>

            <hr className={`mx-3 my-2 ${darkMode ? "border-[#3f3f3f]" : "border-[#e5e5e5]"}`} />

            {/* Footer */}
            <div className="px-4 py-2">
              <p className={`text-[11px] ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
                About Press Copyright<br />
                Contact us Creators<br />
                Advertise Developers
              </p>
              <p className={`text-[11px] mt-2 ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
                Terms Privacy Policy & Safety
              </p>
            </div>
          </>
        )}
      </div>

      {/* Mobile overlay */}
      <div className="block sm:hidden bg-white top-0 fixed z-10 transition ease-in-out delay-150 h-[100vh]">
        <div className={`${sidebarExtended ? "block" : "hidden"} flex items-center space-x-4 ml-3 pl-2 pt-3`}>
          <button onClick={() => { dispatch(setSidebarExtendedValue(!sidebarExtended)); setSidebarExtended(!sidebarExtended); }}>
            <Menu />
          </button>
          <Link to="/">
            {darkMode ? <img className="w-24 ml-4" src={logoDark} alt="" /> : <img className="w-32" src={logo} alt="" />}
          </Link>
        </div>
        <div className="flex flex-col gap-y-2 mt-4">
          {sidebarExtended && mainLinks.map((item, i) => (
            <button
              key={i}
              onClick={() => { pageRoute(item.path); setSidebarExtended(false); dispatch(setSidebarExtendedValue(false)); }}
              className={`flex items-center gap-x-4 px-4 py-2 ${hoverBg} ${textColor}`}
            >
              {item.icon}
              <span className="text-[14px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
