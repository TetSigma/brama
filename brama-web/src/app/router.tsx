import { createBrowserRouter } from 'react-router'
import App from './App'
import { ChatPage } from './ChatPage'
import { NotFound } from './NotFound'

export const router = createBrowserRouter([
  { path: '/', element: <App />, errorElement: <NotFound /> },
  { path: '/chat', element: <ChatPage />, errorElement: <NotFound /> },
  { path: '*', element: <NotFound /> },
])
