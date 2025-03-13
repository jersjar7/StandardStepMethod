import React, { ReactNode, useState } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-white text-xl font-bold">Water Surface Profile Calculator</span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a href="/" className="text-white px-3 py-2 rounded-md text-sm font-medium">Home</a>
                  <a href="/calculator" className="text-primary-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Calculator</a>
                  <a href="/documentation" className="text-primary-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Documentation</a>
                  <a href="/about" className="text-primary-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">About</a>
                </div>
              </div>
            </div>
            <div className="-mr-2 flex md:hidden">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-primary-200 hover:text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-800 focus:ring-white"
              >
                <span className="sr-only">Open main menu</span>
                {!isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="/" className="text-white block px-3 py-2 rounded-md text-base font-medium">Home</a>
              <a href="/calculator" className="text-primary-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Calculator</a>
              <a href="/documentation" className="text-primary-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Documentation</a>
              <a href="/about" className="text-primary-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">About</a>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} Water Surface Profile Calculator. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="/terms" className="text-gray-500 hover:text-gray-700 text-sm">Terms of Service</a>
              <a href="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">Privacy Policy</a>
              <a href="/contact" className="text-gray-500 hover:text-gray-700 text-sm">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;