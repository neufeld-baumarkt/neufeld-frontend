// src/components/cashflow/AlexSidebarKeys.jsx

export default function AlexSidebarKeys({
  modules,
  activeId,
  onChange,
}) {
  return (
    <div className="relative flex flex-col gap-2 py-2 overflow-visible">
      {modules.map((module, index) => {
        const active = module.id === activeId;

        return (
          <button
            key={module.id}
            type="button"
            onClick={() => onChange(module.id)}
            className={`
              group
              relative
              h-16
              w-20
              overflow-visible
              transition-all
              duration-300
              z-20
            `}
          >
            <div
              className={`
                absolute
                left-0
                top-0
                h-16
                rounded-r-xl
                border
                flex
                items-center
                overflow-hidden
                whitespace-nowrap
                transition-all
                duration-300
                shadow-lg

                ${
                  active
                    ? 'w-20 translate-x-2 bg-[#800000] border-white text-white group-hover:w-72'
                    : 'w-20 bg-[#3A3838] border-white/30 text-white/80 group-hover:w-72 group-hover:translate-x-2 group-hover:bg-[#4a4747]'
                }
              `}
            >
              <div className="relative flex items-center justify-center w-20 shrink-0">
                <span className="text-xl font-black tracking-widest">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {active && (
                  <div className="absolute inset-y-2 left-0 w-1 rounded-r bg-white" />
                )}
              </div>

              <div
                className="
                  flex
                  items-center
                  h-full
                  border-l
                  border-white/20
                  pl-4
                  pr-6
                  text-sm
                  font-bold
                  tracking-wide
                  opacity-0
                  transition-opacity
                  duration-200
                  group-hover:opacity-100
                "
              >
                {module.title}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}