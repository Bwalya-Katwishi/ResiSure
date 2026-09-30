import Navbar from './Navbar';

import Footer from './Footer';



export default function Layout({ children }) {

  return (

    <div className="min-h-screen bg-slate-50 text-slate-900">

      <a href="#main-content" className="sr-only sr-only-focusable fixed left-4 top-4 z-[100] rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">

        Skip to main content

      </a>

      <Navbar />

      <main id="main-content" className="page-enter mx-auto max-w-6xl px-4 py-5 sm:px-5 sm:py-8" tabIndex={-1}>

        {children}

      </main>

      <Footer />

    </div>

  );

}

