import { createBrowserRouter } from 'react-router'
import { useChatSessionStore } from '@/contexts/chatSessionStore'
import App from './App'
import { ChatPage } from './ChatPage'
import { NotFound } from './NotFound'

export const router = createBrowserRouter([
  { path: '/', element: <App />, errorElement: <NotFound /> },
  {
    path: '/chat',
    element: <ChatPage />,
    errorElement: <NotFound />,
    loader: () => {
      useChatSessionStore.getState().reset()
      return null
    },
  },
  { path: '*', element: <NotFound /> },
])
