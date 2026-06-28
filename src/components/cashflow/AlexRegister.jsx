// src/components/cashflow/AlexRegister.jsx

export default function AlexRegister({
  number,
  title,
  subtitle,
  isActive,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left transition-all duration-150 ${
        isActive
          ? 'z-20 translate-x-0'
          : 'z-10 translate-x-3 hover:translate-x-1'
      }`}
    >
      <div
        className={`relative rounded-r-2xl border px-5 py-4 shadow-[4px_4px_10px_rgba(0,0,0,0.35)] ${
          isActive
            ? 'bg-[#e6d2a3] border-[#6b4f1d] text-[#2f2412]'
            : 'bg-[#c7aa6a] border-[#5a4219] text-[#3a2b12] opacity-90'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`min-w-[38px] h-[38px] rounded-full border flex items-center justify-center font-black text-sm ${
              isActive
                ? 'border-[#6b4f1d] bg-[#fff3c4]'
                : 'border-[#5a4219] bg-[#ddc27c]'
            }`}
          >
            {number}
          </div>

          <div className="min-w-0">
            <div className="text-lg font-black leading-tight uppercase tracking-wide">
              {title}
            </div>

            {subtitle && (
              <div className="mt-1 text-sm font-semibold opacity-75 leading-snug">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {isActive && (
          <div className="absolute top-0 bottom-0 left-0 w-2 rounded-l-xl bg-[#800000]" />
        )}
      </div>
    </button>
  );
}