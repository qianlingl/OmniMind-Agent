import { useState, useCallback } from 'react';

export function useConfirm() {
  const [pending, setPending] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setPending({ message, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    pending?.resolve(true);
    setPending(null);
  }, [pending]);

  const handleCancel = useCallback(() => {
    pending?.resolve(false);
    setPending(null);
  }, [pending]);

  const ConfirmDialog = pending ? (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" style={{ minWidth: 360, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 12 }}>确认操作</h3>
        <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>{pending.message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={handleCancel}>取消</button>
          <button className="btn btn-danger" onClick={handleConfirm}>确认</button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
