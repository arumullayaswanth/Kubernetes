import React, { useState } from "react";
import Menu from "../assets/Menu";
import logo from "../assets/ytLogo.png";
import logoDark from "../assets/ytLogo-dark.png";
import { Link, useNavigate } from "react-router-dom";
import { setSidebarExtendedValue } from "../redux/categorySlice";
import { useDispatch, useSelector } from "react-redux";
import DarkModeButton from "./DarkModeButton";

function Navbar({ sidebarExtended, setSidebarExtended }) {
  const dispatch = useDispatch();
  const pageRoute = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const { darkMode } = useSelector((state) => state.darkMode);

  const handleOnSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      pageRoute(`/search/${searchValue}`);
    }
  };

  return (
    <div
      className={`h-[56px] fixed top-0 z-30 w-full flex items-center justify-between px-4
        ${darkMode ? "bg-[#0f0f0f]" : "bg-white"}`}
    >
      {/* Left — hamburger + logo */}
      <div className="flex items-center gap-x-4">
        <button
          onClick={() => {
            dispatch(setSidebarExtendedValue(!sidebarExtended));
            setSidebarExtended(!sidebarExtended);
          }}
          className={`p-2 rounded-full ${darkMode ? "hover:bg-[#272727]" : "hover:bg-[#f2f2f2]"}`}
        >
          <Menu />
        </button>
        <Link to="/">
          {darkMode ? (
            <img className="w-24" src={logoDark} alt="YouTube" />
          ) : (
            <img className="w-24" src={logo} alt="YouTube" />
          )}
        </Link>
      </div>

      {/* Center — search */}
      <form onSubmit={handleOnSubmit} className="flex items-center gap-x-2">
        <div className="relative">
          <input
            onChange={(e) => setSearchValue(e.target.value)}
            type="search"
            placeholder="Search"
            className={`w-[300px] sm:w-[420px] md:w-[500px] px-4 py-2 text-[14px] rounded-l-full border
              ${darkMode
                ? "bg-[#121212] border-[#303030] text-white placeholder-[#aaa] focus:border-[#1c62b9]"
                : "bg-white border-[#ccc] text-black placeholder-[#606060] focus:border-[#1c62b9]"
              } focus:outline-none`}
          />
        </div>
        <button
          type="submit"
          className={`px-5 py-2 rounded-r-full border
            ${darkMode
              ? "bg-[#272727] border-[#303030] text-white hover:bg-[#3f3f3f]"
              : "bg-[#f8f8f8] border-[#ccc] text-black hover:bg-[#e5e5e5]"
            }`}
        >
          🔍
        </button>
      </form>

      {/* Right — theme toggle + sign in */}
      <div className="flex items-center gap-x-2">
        <DarkModeButton />
        <button className="flex items-center gap-x-1 border border-[#3ea6ff] text-[#3ea6ff] px-3 py-1 rounded-full text-[14px] font-medium hover:bg-[#263850]">
          <span>👤</span>
          <span className="hidden sm:inline">Sign in</span>
        </button>
      </div>
    </div>
  );
}

export default Navbar;
