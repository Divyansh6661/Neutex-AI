import React from 'react';
import Navigation from './Navigation';

export default function Layout({ children, currentPage, onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation currentPage={currentPage} onNavigate={onNavigate} />
      <main className="relative">
        {children}
      </main>
    </div>
  );
}