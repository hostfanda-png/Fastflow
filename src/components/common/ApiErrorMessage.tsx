import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ApiErrorMessageProps {
  message?: string;
  onRetry?: () => void;
}

export const ApiErrorMessage: React.FC<ApiErrorMessageProps> = ({
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-900 my-4">
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <h3 className="text-sm font-bold">API Connection Error</h3>
      <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
