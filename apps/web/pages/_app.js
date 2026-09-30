import Head from 'next/head';
import { AuthProvider } from '../context/AuthContext';
import DocumentViewerProvider from '../context/DocumentViewerProvider';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <DocumentViewerProvider>
      <Head>
        <title>ResiSure — Verified student accommodation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="Find verified student rooms around UNZA and Lusaka with payment protection." />
        <meta name="theme-color" content="#0047AB" />
      </Head>
      <Toaster
        position="top-center"
        containerStyle={{ top: 72 }}
        gutter={8}
        containerAriaLabel="Notifications"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
      <Component {...pageProps} />
      </DocumentViewerProvider>
    </AuthProvider>
  );
}
