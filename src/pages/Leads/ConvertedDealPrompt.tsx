import { AlertTriangle, ArrowRight, CheckCircle, X } from 'lucide-react';

interface Props {
  leadName: string;
  missing: string[];
  onOpenDeal?: () => void;
  onClose: () => void;
}

export default function ConvertedDealPrompt({ leadName, missing, onOpenDeal, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Deal created</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {leadName} is now a customer with a deal in the pipeline. Everything from the lead was carried over.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-6 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
            <AlertTriangle className="h-4 w-4" /> Still needed on the deal
          </div>
          <ul className="space-y-1.5">
            {missing.map(m => (
              <li key={m} className="flex items-center gap-2 text-sm text-amber-900">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            Later
          </button>
          {onOpenDeal && (
            <button onClick={onOpenDeal} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Finish the deal <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
