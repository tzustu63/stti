import { useState, useRef } from "react";

export const useAudioRecorder = (ws) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setHasPermission(true);
      setIsRecording(true);
      console.log("useAudioRecorder - 設置 isRecording 為 true");

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // 將音訊資料發送到 WebSocket
          if (ws && ws.readyState === WebSocket.OPEN) {
            const arrayBuffer = await event.data.arrayBuffer();
            const base64Audio = btoa(
              String.fromCharCode(...new Uint8Array(arrayBuffer))
            );

            ws.send(
              JSON.stringify({
                type: "audio_chunk",
                data: { chunk: base64Audio },
              })
            );

            console.log("音訊資料已發送:", event.data.size, "bytes");
          }
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        console.log("useAudioRecorder - 設置 isRecording 為 false");
      };

      mediaRecorder.start(1000); // 每秒發送一次資料
    } catch (error) {
      console.error("無法開始錄音:", error);
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      console.log("停止錄音...");
      mediaRecorderRef.current.stop();
    }
  };

  return {
    isRecording,
    hasPermission,
    startRecording,
    stopRecording,
  };
};
