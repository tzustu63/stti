import React from "react";
import { Wifi, WifiOff, Layout, LayoutGrid } from "lucide-react";
import LanguageSelector from "./LanguageSelector";

const Header = ({
  inputLanguage,
  outputLanguage,
  onInputLanguageChange,
  onOutputLanguageChange,
  isConnected,
  displayMode,
  onDisplayModeChange,
}) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">即時口譯</h1>
          </div>

          {/* 語言選擇器和顯示模式切換 */}
          <div className="flex items-center space-x-4">
            <LanguageSelector
              label="輸入語言"
              value={inputLanguage}
              onChange={onInputLanguageChange}
            />

            <div className="text-gray-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>

            <LanguageSelector
              label="輸出語言"
              value={outputLanguage}
              onChange={onOutputLanguageChange}
            />

            {/* 顯示模式切換按鈕 */}
            <div className="ml-4 pl-4 border-l border-gray-200">
              <button
                onClick={() =>
                  onDisplayModeChange(
                    displayMode === "split" ? "single" : "split"
                  )
                }
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors duration-200"
              >
                {displayMode === "split" ? (
                  <>
                    <Layout className="w-4 h-4" />
                    <span className="text-sm">單一顯示</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-sm">分割顯示</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 連線狀態 */}
          <div className="flex items-center">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
