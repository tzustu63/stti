import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import MainArea from "./components/MainArea";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAudioRecorder } from "./hooks/useAudioRecorder";

function App() {
  const [inputLanguage, setInputLanguage] = useState("zh");
  const [outputLanguage, setOutputLanguage] = useState("en");
  // 修改為陣列來存儲多組文字對
  const [textPairs, setTextPairs] = useState([]);
  const [currentOriginalText, setCurrentOriginalText] = useState("");
  const [currentTranslatedText, setCurrentTranslatedText] = useState("");
  const [isPartial, setIsPartial] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [displayMode, setDisplayMode] = useState("split");

  const { ws, isConnected, sendMessage } = useWebSocket();
  const { startRecording, stopRecording, isRecording, isConfigured } =
    useAudioRecorder(sendMessage);

  // 調試信息
  console.log("App - isRecording:", isRecording, "isConfigured:", isConfigured);

  useEffect(() => {
    if (!ws) {
      console.log("WebSocket 未初始化");
      return;
    }

    console.log("設定 WebSocket 訊息處理器，連線狀態:", ws.readyState);

    ws.onmessage = (event) => {
      console.log("收到 WebSocket 訊息:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("解析後的資料:", data);

        switch (data.type) {
          case "transcript":
            // 只處理最終轉錄結果
            if (data.data.is_final) {
              console.log("收到最終逐字稿:", data.data.utterance.text);
              setCurrentOriginalText(data.data.utterance.text);
              setIsPartial(false); // 始終為最終結果
              setErrorMessage(""); // 清除錯誤訊息
            } else {
              console.log("收到部分轉錄（忽略）:", data.data.utterance.text);
            }
            break;
          case "translation":
            console.log("收到翻譯:", data.data.translated_utterance.text);
            setCurrentTranslatedText(data.data.translated_utterance.text);
            break;
          case "recording_started":
            console.log("錄音已開始");
            setErrorMessage(""); // 清除錯誤訊息
            break;
          case "recording_stopped":
            console.log("錄音已停止");
            break;
          case "error":
            console.error("伺服器錯誤:", data.message);
            setErrorMessage(data.message);
            break;
          default:
            console.log("未知訊息類型:", data.type);
        }
      } catch (error) {
        console.error("解析 WebSocket 訊息失敗:", error);
        setErrorMessage("解析訊息失敗");
      }
    };
  }, [ws]);

  // 當翻譯完成時，將文字對添加到陣列中
  useEffect(() => {
    if (currentOriginalText && currentTranslatedText) {
      setTextPairs((prev) => [
        ...prev,
        {
          id: Date.now(),
          original: currentOriginalText,
          translated: currentTranslatedText,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]); // 新文字對放在最後面

      // 清空當前文字
      setCurrentOriginalText("");
      setCurrentTranslatedText("");
    }
  }, [currentOriginalText, currentTranslatedText]);

  const handleStartRecording = () => {
    if (!isConnected) {
      setErrorMessage("WebSocket 未連線，請稍後再試");
      return;
    }

    setErrorMessage(""); // 清除之前的錯誤訊息
    startRecording(inputLanguage, outputLanguage);
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        inputLanguage={inputLanguage}
        outputLanguage={outputLanguage}
        onInputLanguageChange={setInputLanguage}
        onOutputLanguageChange={setOutputLanguage}
        isConnected={isConnected}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
      />
      <MainArea
        textPairs={textPairs}
        currentOriginalText={currentOriginalText}
        currentTranslatedText={currentTranslatedText}
        isPartial={isPartial}
        isRecording={isRecording}
        errorMessage={errorMessage}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
    </div>
  );
}

export default App;
