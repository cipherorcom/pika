// 统计卡片组件
const LittleStatCard = ({
                      label,
                      value,
                  }: {
    label: string;
    value: string | number;
    sublabel?: string;
}) => (
    <div
        key={label}
        className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left transition hover:border-slate-300 dark:border-white/10 dark:bg-[#020b19]/45 dark:hover:border-teal-200/35"
    >
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-gray-600 dark:text-teal-100/75">{label}</p>
        <p className="mt-2 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
);

export default LittleStatCard;
