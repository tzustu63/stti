import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import MainArea from "./components/MainArea";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAudioRecorder } from "./hooks/useAudioRecorder";

function App() {
  const [inputLanguage, setInputLanguage] = useState("zh");
  const [outputLanguage, setOutputLanguage] = useState("en");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isPartial, setIsPartial] = useState(false);

  const { ws, isConnected } = useWebSocket();
  const { startRecording, stopRecording, isRecording } = useAudioRecorder(ws);

  // 調試信息
  console.log("App - isRecording:", isRecording);

  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "transcript":
          setOriginalText(data.data.utterance.text);
          setIsPartial(!data.data.is_final);
          break;
        case "translation":
          setTranslatedText(data.data.translated_utterance.text);
          break;
        case "recording_started":
          // 錄音狀態由 useAudioRecorder 管理
          break;
        case "recording_stopped":
          // 錄音狀態由 useAudioRecorder 管理
          break;
      }
    };
  }, [ws]);

  const handleStartRecording = () => {
    if (ws) {
      // 先發送配置訊息
      ws.send(
        JSON.stringify({
          type: "config",
          sourceLang: inputLanguage,
          targetLang: outputLanguage,
        })
      );
      // 然後開始錄音
      startRecording();
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "stop_recording",
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        inputLanguage={inputLanguage}
        outputLanguage={outputLanguage}
        onInputLanguageChange={setInputLanguage}
        onOutputLanguageChange={setOutputLanguage}
        isConnected={isConnected}
      />
      <MainArea
        originalText={originalText}
        translatedText={translatedText}
        isPartial={isPartial}
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
    </div>
  );
}

export default App;
