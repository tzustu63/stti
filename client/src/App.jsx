import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import MainArea from './components/MainArea'
import { useWebSocket } from './hooks/useWebSocket'
import { useAudioRecorder } from './hooks/useAudioRecorder'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [inputLanguage, setInputLanguage] = useState('zh')
  const [outputLanguage, setOutputLanguage] = useState('en')
  const [originalText, setOriginalText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isPartial, setIsPartial] = useState(false)

  const { ws, isConnected } = useWebSocket()
  const { startRecording, stopRecording, isRecordingAudio } = useAudioRecorder(ws)

  useEffect(() => {
    if (!ws) return

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'asr_result':
          setOriginalText(data.text)
          setIsPartial(!data.isFinal)
          break
        case 'translation_result':
          setTranslatedText(data.translatedText)
          break
        case 'recording_started':
          setIsRecording(true)
          break
        case 'recording_stopped':
          setIsRecording(false)
          break
      }
    }
  }, [ws])

  const handleStartRecording = () => {
    startRecording()
    if (ws) {
      ws.send(JSON.stringify({
        type: 'start_recording',
        inputLanguage,
        outputLanguage
      }))
    }
  }

  const handleStopRecording = () => {
    stopRecording()
    if (ws) {
      ws.send(JSON.stringify({
        type: 'stop_recording'
      }))
    }
  }

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
  )
}

export default App
