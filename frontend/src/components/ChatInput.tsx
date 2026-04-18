import { useState } from 'react';

interface Props {
  onSubmit?: (message: string) => void;
  loading?: boolean;
}

export function ChatInput({ onSubmit, loading = false }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim() || loading) return;
    onSubmit?.(value.trim());
    setValue('');
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Find me the best noise-cancelling headphones under $200…"
        disabled={loading}
        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !value.trim()}
        className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '…' : 'Ask'}
      </button>
    </div>
  );
}
