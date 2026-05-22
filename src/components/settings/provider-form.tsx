"use client";

// This module is kept for backward compatibility.
// The ProviderForm logic is now integrated into api-connections.tsx
// as ProviderConfigForm for inline display matching original project's UX.

export function ProviderForm({
  provider,
  onClose,
}: {
  provider: { id: string; name: string };
  onClose: () => void;
}) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{provider.name} Configuration</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          &times;
        </button>
      </div>
      <p className="text-xs text-zinc-500 mt-2">
        Configuration is now handled inline in the API Connections panel.
      </p>
    </div>
  );
}
