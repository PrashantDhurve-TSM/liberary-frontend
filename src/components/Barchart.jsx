// Simple CSS bar chart. data = [{ label, issued, returned }]
export default function BarChart({ data }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.issued, d.returned]));

  return (
    <div>
      <div className="flex h-44 items-end gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                title={`Issued ${d.issued}`}
                className="w-full max-w-[22px] rounded-t-lg bg-gradient-to-t from-prime to-prime/60"
                style={{ height: `${(d.issued / max) * 100}%` }}
              />
              <div
                title={`Returned ${d.returned}`}
                className="w-full max-w-[22px] rounded-t-lg bg-prime/20"
                style={{ height: `${(d.returned / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-prime" /> Issued</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-prime/20" /> Returned</span>
      </div>
    </div>
  );
}