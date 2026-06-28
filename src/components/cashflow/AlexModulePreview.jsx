// src/components/cashflow/AlexModulePreview.jsx

export default function AlexModulePreview({
  children,
  scale = 0.48,
  width = 1200,
  height = 620,
  className = '',
}) {
  return (
    <div
      className={`relative w-full h-[360px] rounded-xl border border-white/10 bg-black/20 overflow-hidden ${className}`}
    >
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: `${width}px`,
          minHeight: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35" />
    </div>
  );
}