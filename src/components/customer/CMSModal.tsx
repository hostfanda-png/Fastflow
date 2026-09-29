import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, FileText, Shield, HelpCircle, Info } from 'lucide-react';

interface CMSModalProps {
  slug: string;
  onClose: () => void;
}

export const CMSModal: React.FC<CMSModalProps> = ({ slug, onClose }) => {
  const { cmsPages } = useApp();

  const page = cmsPages.find((p) => p.slug === slug) || cmsPages[0];

  const getIcon = () => {
    switch (slug) {
      case 'terms':
      case 'privacy': return <Shield className="w-5 h-5 text-amber-600" />;
      case 'faq': return <HelpCircle className="w-5 h-5 text-amber-600" />;
      default: return <Info className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            {getIcon()}
            <div>
              <h2 className="text-base font-bold text-stone-900">{page.title}</h2>
              <span className="text-[11px] text-stone-400">Last updated: {page.lastUpdated}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line space-y-4">
            {page.content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Close Document
          </button>
        </div>

      </div>
    </div>
  );
};
