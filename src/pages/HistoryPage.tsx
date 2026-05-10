import { useQueryHistory } from '@/hooks/useQueryHistory';
import { useWhoisQuery } from '@/hooks/useWhoisQuery';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';

export default function HistoryPage() {
  const { records, remove, clear } = useQueryHistory();
  const { query } = useWhoisQuery();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '查询历史 - OneFour';
  }, []);

  const handleRequery = (domain: string) => {
    query(domain);
    navigate('/');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-full p-6">
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">查询历史</h1>
          {records.length > 0 && (
            <button
              onClick={clear}
              className="flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-sm)] text-[12px] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay-hover)] hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
              清空全部
            </button>
          )}
        </div>

        {records.length === 0 ? (
          <div className="text-center py-20">
            <Clock size={48} className="mx-auto text-[var(--text-tertiary)] mb-4" strokeWidth={1.2} />
            <p className="text-[14px] text-[var(--text-tertiary)]">暂无查询记录</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">查询域名后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <div
                key={record.id}
                className="group flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] border border-[var(--border-neutral)] hover:bg-[var(--bg-overlay)] transition-colors animate-fade-in"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${record.status ? 'bg-[var(--brand-green)]' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] font-mono truncate">
                      {record.query}
                    </span>
                    {!record.status && (
                      <span className="text-[11px] text-red-400">失败</span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)]">{formatTime(record.timestamp)}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRequery(record.query)}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay-hover)] hover:text-[var(--brand-primary)] transition-colors"
                    title="重新查询"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => remove(record.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay-hover)] hover:text-red-500 transition-colors"
                    title="删除"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
