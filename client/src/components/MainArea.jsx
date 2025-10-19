import React from "react";
import { Mic, MicOff } from "lucide-react";

const MainArea = ({
  originalText,
  translatedText,
  isPartial,
  isRecording,
  onStartRecording,
  onStopRecording,
}) => {
  // 調試信息
  console.log("MainArea - isRecording:", isRecording);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-96">
        {/* 原文逐字稿區域 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                原文逐字稿
              </h2>
              <div className="flex items-center space-x-2">
                {isRecording && (
                  <div className="flex items-center text-red-500">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm">錄音中</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-gray-50 rounded-md p-4 overflow-y-auto">
              <div className="min-h-full flex items-start">
                {originalText ? (
                  <p
                    className={`text-lg leading-relaxed ${
                      isPartial ? "partial-text" : "final-text"
                    }`}
                  >
                    {originalText}
                  </p>
                ) : (
                  <p className="text-gray-500 text-lg">等待語音輸入...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 翻譯結果區域 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              翻譯結果
            </h2>

            <div className="flex-1 bg-gray-50 rounded-md p-4 overflow-y-auto">
              <div className="min-h-full flex items-start">
                {translatedText ? (
                  <p className="text-lg leading-relaxed text-gray-900">
                    {translatedText}
                  </p>
                ) : (
                  <p className="text-gray-500 text-lg">等待翻譯結果...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 錄音控制按鈕 */}
      <div className="flex justify-center space-x-4 mt-8">
        {/* 開始錄音按鈕 */}
        <button
          onClick={onStartRecording}
          disabled={isRecording}
          className={`flex items-center space-x-3 px-8 py-4 rounded-full text-white font-medium transition-all duration-200 ${
            isRecording
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 shadow-lg"
          }`}
        >
          <Mic className="w-6 h-6" />
          <span>開始錄音</span>
        </button>

        {/* 停止錄音按鈕 */}
        <button
          onClick={onStopRecording}
          disabled={!isRecording}
          className={`flex items-center space-x-3 px-8 py-4 rounded-full text-white font-medium transition-all duration-200 ${
            !isRecording
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600 shadow-lg"
          }`}
        >
          <MicOff className="w-6 h-6" />
          <span>停止錄音</span>
        </button>
      </div>
    </main>
  );
};

export default MainArea;
