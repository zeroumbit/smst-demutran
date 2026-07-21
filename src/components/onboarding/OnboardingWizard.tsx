import { useState, useRef, useCallback, type ReactNode } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

export interface OnboardingStep {
  icon: ReactNode;
  title: string;
  description: string;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  totalSteps: number;
  onFinish: () => void;
}

export function OnboardingWizard({ steps, totalSteps, onFinish }: OnboardingWizardProps) {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);
  const [animating, setAnimating] = useState(false);
  const touchStart = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number, dir: 'left' | 'right') => {
    if (animating) return;
    setAnimDir(dir);
    setAnimating(true);
    setCurrent(index);
    setTimeout(() => {
      setAnimating(false);
      setAnimDir(null);
    }, 300);
  }, [animating]);

  const next = useCallback(() => {
    if (current < totalSteps - 1) {
      goTo(current + 1, 'left');
    }
  }, [current, totalSteps, goTo]);

  const prev = useCallback(() => {
    if (current > 0) {
      goTo(current - 1, 'right');
    }
  }, [current, goTo]);

  const finish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 60) return;
    if (diff > 0 && current < totalSteps - 1) {
      next();
    } else if (diff < 0 && current > 0) {
      prev();
    }
  }, [current, totalSteps, next, prev]);

  const step = steps[current];
  if (!step) return null;

  const isLast = current === totalSteps - 1;

  const slideClass = animating
    ? animDir === 'left'
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left'
    : '';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-slate-50 to-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative flex flex-1 flex-col items-center justify-center px-8">
        <button
          onClick={finish}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-slate-600"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div key={current} className={`flex flex-col items-center text-center ${slideClass}`}>
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-primary-light to-primary shadow-[0_12px_32px_-8px_rgba(8,69,140,0.35)]">
            <div className="text-white">
              {step.icon}
            </div>
          </div>

          <h2 className="mb-3 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">
            {step.title}
          </h2>

          <p className="max-w-xs text-[15px] leading-relaxed text-slate-500">
            {step.description}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 px-8 pb-12">
        <div className="flex items-center gap-2.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-7 bg-primary'
                  : i < current
                    ? 'w-2 bg-primary/40'
                    : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </div>

        <div className="flex w-full items-center justify-between gap-4">
          <button
            onClick={finish}
            className="rounded-2xl px-6 py-3.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:scale-[0.97]"
          >
            Pular
          </button>

          {isLast ? (
            <button
              onClick={finish}
              className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(8,69,140,0.4)] transition-all hover:bg-primary-dark active:scale-[0.97]"
            >
              Concluir
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={next}
              className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(8,69,140,0.4)] transition-all hover:bg-primary-dark active:scale-[0.97]"
            >
              Próximo
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.28s ease-out; }
        .animate-slide-in-left { animation: slide-in-left 0.28s ease-out; }
      `}</style>
    </div>
  );
}
