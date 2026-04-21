import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Who & Where', sub: 'Customer & site' },
  { label: 'Systems', sub: "What you're selling" },
  { label: 'Products', sub: 'Line items & pricing' },
  { label: 'Scope & Terms', sub: 'Proposal details' },
  { label: 'Review & Send', sub: 'Finalize & deliver' },
];

interface Props {
  currentStep: number;
}

export default function WizardProgressBar({ currentStep }: Props) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <div className="mt-1.5 text-center hidden md:block">
                <p className={`text-xs font-semibold whitespace-nowrap ${isActive ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 whitespace-nowrap">{step.sub}</p>
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-12 md:w-16 lg:w-24 mx-1 mb-5 transition-colors ${stepNum < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
