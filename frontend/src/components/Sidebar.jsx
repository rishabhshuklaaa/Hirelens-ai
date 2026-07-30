import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { 
      path: "/", 
      label: "Setup & Upload", 
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      badge: "Step 1"
    },
    { 
      path: "/audit", 
      label: "AI Audit", 
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      badge: "Live"
    },
    { 
      path: "/decisions", 
      label: "Decisions", 
      icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      badge: null
    },
  ];

  return (
    <aside 
      className={`relative flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out border-r border-slate-800/80 select-none z-30 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Background Layer (Clean Dark Slate - No Blue Overload) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src="/images/bg.jpg" 
          alt="Sidebar Background" 
          className="w-full h-full object-cover scale-105 filter blur-[2px]"
        />
        {/* Modern Charcoal Black Backdrop */}
        <div className="absolute inset-0 bg-[#0B0F19]/95 backdrop-blur-md"></div>
        {/* Subtle Warm Crimson Ambient Glow at top */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full text-slate-300">
        
        {/* Logo & Header Area */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between min-h-[73px]">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? "justify-center w-full" : ""}`}>
            
            {/* UNBOXED LARGE WHITE MAGNIFYING GLASS WITH WHITE 'H' */}
            <div className="flex-shrink-0 flex items-center justify-center p-1">
              <svg className="h-8 w-8 text-white filter drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                <text x="10" y="13.5" textAnchor="middle" fontSize="10" fontWidth="900" fontWeight="900" fill="white" stroke="none">H</text>
              </svg>
            </div>
            
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-white font-display whitespace-nowrap leading-none flex items-center gap-1.5">
                  HireLens 
                  {/* AI WITH RED-TO-WHITE GRADIENT */}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-200 to-white font-black">
                    AI
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-1">Beyond Keyword Matching</span>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button */}
          {!isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(true)}
              title="Collapse Sidebar"
              className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800/60 rounded-lg border border-transparent hover:border-slate-700/60 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Collapsed State Expand Button */}
        {isCollapsed && (
          <div className="p-3 flex justify-center border-b border-slate-800/40">
            <button 
              onClick={() => setIsCollapsed(false)}
              title="Expand Sidebar"
              className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800/60 rounded-lg border border-slate-800 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <div>
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Workspace Menu
              </p>
            )}

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    title={isCollapsed ? item.label : ""}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                      isCollapsed ? "justify-center" : ""
                    } ${
                      isActive 
                        ? "bg-slate-800/80 text-white border border-slate-700/80 shadow-md shadow-black/20" 
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg 
                        className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? "text-rose-400" : "text-slate-400 group-hover:text-slate-200"
                        }`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      {!isCollapsed && <span className="whitespace-nowrap tracking-wide">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span 
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isActive 
                            ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" 
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Profile & Logout Area */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          
          <div className={`p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3 mb-2 ${isCollapsed ? "justify-center p-2" : ""}`}>
            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "R"}
            </div>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {user?.email || "recruiter@hirelens.ai"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 font-medium">Recruiter Admin</span>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            title={isCollapsed ? "Logout" : ""}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;