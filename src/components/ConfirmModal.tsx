import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-error" />
          </div>
          <h3 className="text-xl font-bold text-on-surface text-center mb-2">{title}</h3>
          <p className="text-on-surface-variant text-center mb-6">
            {message}
          </p>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
              }}
              className="flex-1 py-2 px-4 bg-surface-variant text-on-surface rounded-lg font-medium hover:bg-surface-variant/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await onConfirm();
                onCancel();
              }}
              className="flex-1 py-2 px-4 bg-error text-white rounded-lg font-medium hover:bg-error/90 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
