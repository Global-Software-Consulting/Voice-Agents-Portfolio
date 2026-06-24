// Suggested test prompts so visitors know exactly what to ask.

export function SuggestedPrompts({ prompts }: { prompts: string[] }) {
  if (!prompts.length) return null;
  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Try saying
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompts.map((p) => (
          <span
            key={p}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
          >
            “{p}”
          </span>
        ))}
      </div>
    </div>
  );
}
