import { useState, useRef, useCallback } from "react";

export const useAudioRecorder = (sendMessage) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback(
    async (sourceLang = "zh", targetLang = "en") => {
      try {
        // 首先配置語言設定
        if (sendMessage) {
          sendMessage({
            type: "config",
            sourceLang: sourceLang,
            targetLang: targetLang,
          });
          setIsConfigured(true);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        setHasPermission(true);
        setIsRecording(true);
        isRecordingRef.current = true;
        streamRef.current = stream;
        console.log("useAudioRecorder - 開始錄音");

        // 創建 AudioContext
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)({
          sampleRate: 16000,
        });
        audioContextRef.current = audioContext;

        // 創建音訊源
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // 創建 ScriptProcessorNode 來處理音訊資料
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (!isRecordingRef.current) return;

          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);

          // 將 Float32Array 轉換為 Int16Array (PCM 16-bit)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(
              -32768,
              Math.min(32767, inputData[i] * 32768)
            );
          }

          // 轉換為 base64
          const base64Pcm = btoa(
            String.fromCharCode(...new Uint8Array(pcmData.buffer))
          );

          // 發送到 WebSocket
          if (sendMessage) {
            sendMessage({
              type: "audio_chunk",
              data: { chunk: base64Pcm },
            });
            console.log("PCM 音訊資料已發送:", pcmData.length, "samples");
          }
        };

        // 連接音訊節點
        source.connect(processor);
        processor.connect(audioContext.destination);
      } catch (error) {
        console.error("無法開始錄音:", error);
        setHasPermission(false);
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    },
    [sendMessage]
  );

  const stopRecording = useCallback(() => {
    console.log("useAudioRecorder - 停止錄音");
    isRecordingRef.current = false;
    setIsRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // 發送停止錄音訊息
    if (sendMessage) {
      sendMessage({
        type: "stop_recording",
      });
    }
  }, [sendMessage]);

  return {
    isRecording,
    hasPermission,
    isConfigured,
    startRecording,
    stopRecording,
  };
};
