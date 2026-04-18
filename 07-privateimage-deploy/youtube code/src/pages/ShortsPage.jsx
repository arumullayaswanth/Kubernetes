import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { shorts } from "../utils/videos";

function ShortsPage() {
    const { sidebarExtend } = useSelector((state) => state.category);
    const { darkMode } = useSelector((state) => state.darkMode);
    const pageRoute = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);

    const textColor = darkMode ? "text-white" : "text-[#0f0f0f]";

    return (
        <>
            <div className={`sm:hidden overlayEffect ${sidebarExtend ? "block" : "hidden"}`} />

            <div className={`pl-[72px] pt-[70px] min-h-screen ${darkMode ? "bg-[#0f0f0f]" : "bg-white"}`}>
                <h2 className={`text-[22px] font-bold px-6 mb-6 flex items-center gap-x-2 ${textColor}`}>
                    <span className="text-red-600 text-2xl">▶</span> Shorts
                </h2>

                {/* Shorts Grid */}
                <div className="px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6">
                    {shorts.map((short, index) => (
                        <div
                            key={index}
                            className="cursor-pointer"
                            onClick={() => pageRoute(`/watch/${short.videoId}`)}
                        >
                            <div className="relative">
                                <img
                                    className="w-full rounded-[12px] object-cover"
                                    style={{ aspectRatio: "9/16", minHeight: "200px" }}
                                    src={short.thumbnail}
                                    alt={short.title}
                                />
                                {/* Play overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-[12px] bg-black bg-opacity-30">
                                    <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                                        <span className="text-black text-xl ml-1">▶</span>
                                    </div>
                                </div>
                            </div>
                            <h3 className={`text-[13px] font-semibold mt-2 leading-[18px] line-clamp-2 ${textColor}`}>
                                {short.title}
                            </h3>
                            <p className={`text-[11px] mt-1 ${darkMode ? "text-[#aaa]" : "text-[#606060]"}`}>
                                {short.channel}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default ShortsPage;
