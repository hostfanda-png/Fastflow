import React from 'react';
import { AlertTriangle, Home, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export interface NotFoundViewProps {
  type?: 'frontend_404' | 'api_404' | 'auth_401' | 'auth_403';
  path?: string;
  message?: string;
  onNavigateHome?: () => void;
  onNavigateAdmin?: () => void;
  onRetry?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  type = 'frontend_404',
  path = typeof window !== 'undefined' ? window.location.pathname : '',
  message,
  onNavigateHome,
  onNavigateAdmin,
  onRetry,
}) => {
  const isAuthError = type === 'auth_401' || type === 'auth_403';
  const isApiError = type === 'api_404';

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 p-8 text-center shadow-lg">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
          isAuthError ? 'bg-amber-100 text-amber-700 border border-amber-300' :
          isApiError ? 'bg-rose-100 text-rose-700 border border-rose-300' :
          'bg-stone-100 text-stone-700 border border-stone-300'
        }`}>
          {isAuthError ? (
            <ShieldAlert className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>

        <div className="inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mb-2 bg-stone-100 text-stone-600">
          {type === 'frontend_404' && 'HTTP 404 · Frontend Route Not Found'}
          {type === 'api_404' && 'HTTP 404 · Backend Resource Not Found'}
          {type === 'auth_401' && 'HTTP 401 · Authentication Required'}
          {type === 'auth_403' && 'HTTP 403 · Access Forbidden'}
        </div>

        <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
          {type === 'frontend_404' && 'Page Not Found'}
          {type === 'api_404' && 'Resource Not Found'}
          {type === 'auth_401' && 'Session Expired / Unauthorized'}
          {type === 'auth_403' && 'Restricted Admin Access'}
        </h2>

        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
          {message || (
            type === 'frontend_404'
              ? `The requested route "${path}" is not mapped to any known Fastflow view or component.`
              : type === 'api_404'
              ? `The backend API endpoint for "${path}" returned a 404 Not Found response.`
              : type === 'auth_401'
              ? 'You must be signed in with a valid Super Administrator account to view this workspace.'
              : 'Your current account does not have sufficient Super Administrator privileges.'
          )}
        </p>

        {path && (
          <div className="mt-4 p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] font-mono text-stone-600 truncate text-left">
            <span className="text-stone-400">Path: </span>{path}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}

          {path.startsWith('/admin') && onNavigateAdmin && (
            <button
              onClick={onNavigateAdmin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          )}

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Storefront</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
