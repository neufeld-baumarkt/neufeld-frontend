// src/components/cashflow/AlexSidebarKeys.jsx

export default function AlexSidebarKeys({
  modules,
  activeId,
  onChange,
}) {
  return (
    <div className="flex flex-col gap-2 py-2">
      {modules.map((module, index) => {
        const active = module.id === activeId;

        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onChange(module.id)}
            className={`
              relative
              h-16
              w-20
              rounded-r-xl
              border
              transition-all
              duration-150
              font-black
              text-xl
              tracking-widest
              shadow-lg

              ${
                active
                  ? 'translate-x-2 bg-[#800000] border-white text-white'
                  : 'bg-[#3A3838] border-white/30 text-white/80 hover:bg-[#4a4747] hover:translate-x-1'
              }
            `}
          >
            {String(index + 1).padStart(2, '0')}

            {active && (
              <div className="absolute inset-y-2 left-0 w-1 rounded-r bg-white" />
            )}
          </button>
        );
      })}
    </div>
  );
}