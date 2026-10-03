import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);

  const showToast = useCallback((text) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* 見た目の指定（.np .toast）が効くように .np の中に出す */}
      {msg && <div className="np"><div className="toast" role="status">{msg}</div></div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
