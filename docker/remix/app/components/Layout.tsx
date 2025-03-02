import React from 'react';

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

export function Layout({ title, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {title && (
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          </header>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}