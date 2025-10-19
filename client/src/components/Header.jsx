import React from "react";
import { Wifi, WifiOff } from "lucide-react";
import LanguageSelector from "./LanguageSelector";

const Header = ({
  inputLanguage,
  outputLanguage,
  onInputLanguageChange,
  onOutputLanguageChange,
  isConnected,
}) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">即時口譯</h1>
          </div>

          {/* 語言選擇器 */}
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
