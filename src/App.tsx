import './App.css'

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EditorShell } from './theme01/editor/EditorShell'
import { LoginPage } from './theme01/auth/LoginPage'

function RequireAuth({ children }: { children: React.ReactElement }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (!token) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/editor"
          element={(
            <RequireAuth>
              <EditorShell />
            </RequireAuth>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
