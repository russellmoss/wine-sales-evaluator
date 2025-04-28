"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NavigationMenu: React.FC = () => {
  const pathname = usePathname();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <nav className="bg-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="font-bold text-xl">
                Wine Sales Evaluator
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === '/'
                      ? 'bg-purple-800'
                      : 'hover:bg-purple-800'
                  }`}
                >
                  Dashboard
                </Link>
                
                {/* Create New Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsCreateOpen(!isCreateOpen)}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      pathname.startsWith('/rubric-generator')
                        ? 'bg-purple-800'
                        : 'hover:bg-purple-800'
                    }`}
                  >
                    Create New
                    <svg
                      className={`ml-2 h-4 w-4 transition-transform ${
                        isCreateOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isCreateOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <Link
                        href="/rubric-generator"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50"
                        onClick={() => setIsCreateOpen(false)}
                      >
                        New Rubric
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationMenu; 