import { createBrowserRouter } from 'react-router'
import App from './App'
import { ChatPage } from './pages/ChatPage'

export const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/chat', element: <ChatPage /> },
])
