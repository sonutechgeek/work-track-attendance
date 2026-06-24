import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { getMeAsync } from './store/slices/auth.slice';
import router from './router';
import Spinner from './components/ui/Spinner';

function AppInner() {
  const dispatch = useDispatch();
  const initializing = useSelector((s) => s.auth.initializing);

  useEffect(() => {
    // If a token exists, restore the session silently
    if (localStorage.getItem('accessToken')) {
      dispatch(getMeAsync());
    }
  }, [dispatch]);

  if (initializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '14px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,.12)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
        }}
      />
    </>
  );
}

export default function App() {
  return <AppInner />;
}
