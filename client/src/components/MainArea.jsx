import React, { useRef, useEffect } from "react";
import { Mic, MicOff, Layout, LayoutGrid } from "lucide-react";

const MainArea = ({
  textPairs,
  currentOriginalText,
  currentTranslatedText,
  isPartial,
  isRecording,
  errorMessage,
  displayMode,
  onDisplayModeChange,
  onStartRecording,
  onStopRecording,
}) => {
  // 調試信息
  console.log("MainArea - isRecording:", isRecording);

  // 滾動引用
  const splitOriginalScrollRef = useRef(null);
  const splitTranslatedScrollRef = useRef(null);
  const singleModeScrollRef = useRef(null);

  // 自動滾動到最新內容
  const scrollToBottom = (scrollRef) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // 當有新的文字對時，滾動到最新內容
  useEffect(() => {
    if (textPairs.length > 0) {
      scrollToBottom(splitOriginalScrollRef);
      scrollToBottom(splitTranslatedScrollRef);
      scrollToBottom(singleModeScrollRef);
    }
  }, [textPairs]);

  // 當有當前文字時，也滾動到最新內容
  useEffect(() => {
    if (currentOriginalText || currentTranslatedText) {
      scrollToBottom(splitOriginalScrollRef);
      scrollToBottom(splitTranslatedScrollRef);
      scrollToBottom(singleModeScrollRef);
    }
  }, [currentOriginalText, currentTranslatedText]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {displayMode === "split" ? (
        // 分割顯示模式
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 min-h-[600px]">
          {/* 原文逐字稿區域 */}
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 sm:p-6 flex flex-col flex-1">
              <div className="flex items-center justify-end mb-4">
                <div className="flex items-center space-x-2">
                  {isRecording && (
                    <div className="flex items-center text-red-500">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      <span className="text-sm">錄音中</span>
                    </div>
                  )}
                </div>
              </div>

              <div
                ref={splitOriginalScrollRef}
                className="flex-1 bg-gray-50 rounded-md p-4 sm:p-6 overflow-y-auto min-h-[400px]"
              >
                <div className="space-y-4">
                  {/* 顯示所有已完成的文字對 */}
                  {textPairs.map((pair, index) => (
                    <div key={pair.id} className="text-pair-item">
                      <div className="text-xs text-gray-500 mb-1">
                        {pair.timestamp}
                      </div>
                      <div className="transcript-content text-gray-900 whitespace-pre-wrap break-words">
                        {pair.original}
                      </div>
                    </div>
                  ))}

                  {/* 顯示當前正在處理的文字 */}
                  {currentOriginalText && (
                    <div className="text-pair-item">
                      <div className="text-xs text-gray-500 mb-1">
                        處理中...
                      </div>
                      <div
                        className={`transcript-content whitespace-pre-wrap break-words ${
                          isPartial ? "partial-text" : "final-text"
                        }`}
                      >
                        {currentOriginalText}
                      </div>
                    </div>
                  )}

                  {textPairs.length === 0 && !currentOriginalText && (
                    <p className="text-gray-500 text-base sm:text-lg">
                      等待語音輸入...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 翻譯結果區域 */}
          <div className="bg-white rounded-lg shadow-sm border flex flex-col">
            <div className="p-4 sm:p-6 flex flex-col flex-1">
              <div
                ref={splitTranslatedScrollRef}
                className="flex-1 bg-gray-50 rounded-md p-4 sm:p-6 overflow-y-auto min-h-[400px]"
              >
                <div className="space-y-4">
                  {/* 顯示所有已完成的翻譯 */}
                  {textPairs.map((pair, index) => (
                    <div key={pair.id} className="text-pair-item">
                      <div className="text-xs text-gray-500 mb-1">
                        {pair.timestamp}
                      </div>
                      <div className="transcript-content text-gray-900 whitespace-pre-wrap break-words">
                        {pair.translated}
                      </div>
                    </div>
                  ))}

                  {/* 顯示當前正在處理的翻譯 */}
                  {currentTranslatedText && (
                    <div className="text-pair-item">
                      <div className="text-xs text-gray-500 mb-1">
                        翻譯中...
                      </div>
                      <div className="transcript-content text-gray-900 whitespace-pre-wrap break-words">
                        {currentTranslatedText}
                      </div>
                    </div>
                  )}

                  {textPairs.length === 0 && !currentTranslatedText && (
                    <p className="text-gray-500 text-base sm:text-lg">
                      等待翻譯結果...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 單一顯示模式
        <div className="bg-white rounded-lg shadow-sm border min-h-[600px]">
          <div className="p-6 sm:p-8">
            <div
              ref={singleModeScrollRef}
              className="space-y-6 max-h-[500px] overflow-y-auto single-mode-scroll"
            >
              {/* 顯示所有已完成的文字對 */}
              {textPairs.map((pair, index) => (
                <div key={pair.id} className="text-pair-container">
                  <div className="text-xs text-gray-500 mb-2">
                    {pair.timestamp}
                  </div>

                  {/* 第一行：原文逐字稿 */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="transcript-content whitespace-pre-wrap break-words text-base">
                      {pair.original}
                    </div>
                  </div>

                  {/* 第二行：翻譯結果 - 更大更清楚 */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="transcript-content text-gray-900 whitespace-pre-wrap break-words text-xl sm:text-2xl font-medium leading-relaxed">
                      {pair.translated}
                    </div>
                  </div>
                </div>
              ))}

              {/* 顯示當前正在處理的文字對 */}
              {currentOriginalText && (
                <div className="text-pair-container">
                  <div className="text-xs text-gray-500 mb-2">處理中...</div>

                  {/* 第一行：當前原文 */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div
                      className={`transcript-content whitespace-pre-wrap break-words text-base ${
                        isPartial ? "partial-text" : "final-text"
                      }`}
                    >
                      {currentOriginalText}
                    </div>
                  </div>

                  {/* 第二行：當前翻譯 */}
                  {currentTranslatedText && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="transcript-content text-gray-900 whitespace-pre-wrap break-words text-xl sm:text-2xl font-medium leading-relaxed">
                        {currentTranslatedText}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {textPairs.length === 0 && !currentOriginalText && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">等待語音輸入...</p>
                </div>
              )}
            </div>

            {/* 錄音狀態指示 */}
            {isRecording && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center text-red-500">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
                  <span className="text-lg font-medium">錄音中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 錯誤訊息顯示 */}
      {errorMessage && (
        <div className="flex justify-center mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        </div>
      )}

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
