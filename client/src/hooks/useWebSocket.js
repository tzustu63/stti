import { useState, useEffect } from 'react'

export const useWebSocket = () => {
  const [ws, setWs] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port || (protocol === 'wss:' ? '443' : '3000')
    const wsUrl = `${protocol}//${host}:${port}`

    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      console.log('WebSocket 連線已建立')
      setIsConnected(true)
    }

    websocket.onclose = () => {
      console.log('WebSocket 連線已關閉')
      setIsConnected(false)
    }

    websocket.onerror = (error) => {
      console.error('WebSocket 錯誤:', error)
      setIsConnected(false)
    }

    setWs(websocket)

    return () => {
      websocket.close()
    }
  }, [])

  return { ws, isConnected }
}
