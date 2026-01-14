import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Terminal, CornerDownLeft, Trash2 } from 'lucide-react';
import { WindowWrapper } from './WindowWrapper';

interface ConsoleWindowProps {
  accentColor: string;
  onClose?: () => void;
}

type ConsoleEntry = {
  id: string;
  command: string;
  output: string;
  ok: boolean;
  at: number;
};

export function ConsoleWindow({ accentColor, onClose }: ConsoleWindowProps) {
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length]);

  const run = async () => {
    const trimmed = command.trim();
    if (!trimmed || running) return;

    setRunning(true);
    setCommand('');

    try {
      const out = await invoke<string>('run_shell', { command: trimmed });
      setEntries((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          command: trimmed,
          output: out || '',
          ok: true,
          at: Date.now(),
        },
      ]);
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as any)?.toString?.() ?? 'Command failed';
      setEntries((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          command: trimmed,
          output: msg,
          ok: false,
          at: Date.now(),
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <WindowWrapper
      title="Terminal"
      subtitle="System Console"
      icon={<Terminal size={22} />}
      accentColor={accentColor}
      onClose={onClose}
    >
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="px-6 pt-4 pb-2">
          <button
            onClick={() => setEntries([])}
            className="px-4 py-2 rounded-xl flex items-center gap-2 bg-white/40 hover:bg-white/60 transition-all text-slate-500"
            title="Clear"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">Clear</span>
          </button>
        </div>

        {/* Output */}
        <div ref={scrollRef} className="flex-1 px-6 pb-6 overflow-auto select-text">
        {entries.length === 0 ? (
          <div className="h-full w-full rounded-[2rem] border border-dashed border-white/50 bg-white/10 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-bold text-slate-600">コマンドを入力して実行できます</div>
              <div className="text-[11px] text-slate-500 mt-1">例: `ls -la` / `nmcli dev wifi list`</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((e) => (
              <div key={e.id} className="rounded-2xl border border-white/40 bg-white/25 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between bg-white/20">
                  <div className="font-mono text-[12px] text-slate-800">$ {e.command}</div>
                  <div
                    className={`text-[10px] font-black tracking-widest uppercase ${e.ok ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {e.ok ? 'OK' : 'ERR'}
                  </div>
                </div>
                <pre className="p-4 text-[12px] leading-relaxed whitespace-pre-wrap font-mono text-slate-700">
{e.output || '(no output)'}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

        {/* Input */}
        <div className="p-5 border-t border-white/40 bg-white/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/40" style={{ color: accentColor }}>
              <CornerDownLeft size={18} />
            </div>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') run();
              }}
              disabled={running}
              placeholder={running ? 'Running…' : 'sh -lc …'}
              className="flex-1 h-12 px-4 rounded-2xl bg-white/40 border border-white/50 outline-none focus:ring-2 focus:ring-white/60 font-mono text-[13px] text-slate-800 placeholder:text-slate-400"
            />
            <button
              onClick={run}
              disabled={running || !command.trim()}
              className="h-12 px-6 rounded-2xl text-white font-black tracking-widest text-[11px] uppercase transition-all disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              Run
            </button>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            注意: ここで実行するコマンドはあなたのユーザー権限でOSに影響します。
          </div>
        </div>
      </div>
    </WindowWrapper>
  );
}
