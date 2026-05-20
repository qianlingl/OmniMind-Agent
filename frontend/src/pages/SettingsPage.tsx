import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../api/client';
import { Eye, EyeOff, Check, X, Moon, Sun, Save, Loader } from 'lucide-react';

export default function SettingsPage() {
  const { apiKey, setApiKey } = useAuth();
  const { toast } = useToast();
  const [key, setKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null);
  const [llmBaseUrl, setLlmBaseUrl] = useState(localStorage.getItem('om_llm_base_url') || 'https://api.deepseek.com');
  const [llmModel, setLlmModel] = useState(localStorage.getItem('om_llm_model') || 'deepseek-chat');
  const [bingKey, setBingKey] = useState(localStorage.getItem('om_bing_key') || '');
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('om_theme') as 'dark' | 'light' || 'dark');
  const [reminderTime, setReminderTime] = useState(localStorage.getItem('om_reminder_time') || '09:00');
  const [showKey, setShowKey] = useState(false);
  const [showBingKey, setShowBingKey] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('om_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (key && key !== apiKey) {
      setValidationResult(null);
    }
  }, [key, apiKey]);

  const validateApiKey = async (apiKeyToTest: string) => {
    setValidating(true);
    setValidationResult(null);
    try {
      const testApi = new (await import('../api/client')).ApiClient();
      testApi.setApiKey(apiKeyToTest);
      await testApi.post<{ task_id: string }>('/tasks', {
        type: 'test',
        description: 'validate',
        requirements: [],
      });
      setValidationResult('valid');
      toast('API 密钥验证通过', 'success');
    } catch (e: unknown) {
      const err = e as Error;
      if (String(err).includes('401') || String(err).includes('403')) {
        setValidationResult('invalid');
        toast('API 密钥无效', 'error');
      } else if (String(err).includes('timeout') || String(err).includes('Timeout')) {
        toast('验证超时，请检查网络', 'error');
      } else {
        setValidationResult('valid');
        toast('密钥设置成功（服务器无需认证）', 'success');
      }
    } finally {
      setValidating(false);
    }
  };

  const handleSave = () => {
    setApiKey(key);
    localStorage.setItem('om_llm_base_url', llmBaseUrl);
    localStorage.setItem('om_llm_model', llmModel);
    localStorage.setItem('om_bing_key', bingKey);
    localStorage.setItem('om_reminder_time', reminderTime);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    toast('设置已保存', 'success');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ margin: 0 }}>设置</h1>
        <p className="page-subtitle">配置 LLM、搜索 API 和学习提醒</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 620 }}>

        {/* API Key */}
        <div className="card">
          <div className="card-header">API 密钥</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="label">前端访问密钥</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={e => { setKey(e.target.value); setValidationResult(null); }}
                  placeholder="输入你的 API 密钥（开发模式下无需配置）..."
                  style={{ paddingRight: 80 }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute', right: 44, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4,
                  }}
                >
                  {showKey ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                </button>
                <button
                  type="button"
                  onClick={() => validateApiKey(key)}
                  disabled={!key || validating}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: key ? 'pointer' : 'not-allowed',
                    color: validating ? 'var(--text-muted)' : validationResult === 'valid' ? 'var(--accent-green)' : validationResult === 'invalid' ? 'var(--accent-red)' : 'var(--accent-blue)',
                    padding: 4, transition: 'color 0.15s',
                  }}
                  title={validating ? '验证中...' : '验证密钥'}
                >
                  {validating ? <Loader size={15} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> : validationResult === 'valid' ? <Check size={15} strokeWidth={2.5} /> : validationResult === 'invalid' ? <X size={15} strokeWidth={2.5} /> : <Eye size={15} strokeWidth={2} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
                点击右侧眼睛图标验证密钥是否有效
              </p>
            </div>
            {validationResult === 'valid' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-green)' }}>
                <Check size={14} strokeWidth={2.5} />
                密钥有效
              </div>
            )}
            {validationResult === 'invalid' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-red)' }}>
                <X size={14} strokeWidth={2.5} />
                密钥无效，请检查后重新输入
              </div>
            )}
          </div>
        </div>

        {/* LLM Config */}
        <div className="card">
          <div className="card-header">大语言模型</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label">API 地址</label>
              <input className="input" value={llmBaseUrl} onChange={e => setLlmBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" />
            </div>
            <div>
              <label className="label">模型名称</label>
              <input className="input" value={llmModel} onChange={e => setLlmModel(e.target.value)} placeholder="deepseek-chat" />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['deepseek-chat', 'gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'].map(m => (
                <button key={m} className={`btn btn-sm ${llmModel === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLlmModel(m)} style={{ fontSize: 11 }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search API */}
        <div className="card">
          <div className="card-header">搜索配置</div>
          <div>
            <label className="label">Bing API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showBingKey ? 'text' : 'password'}
                value={bingKey}
                onChange={e => setBingKey(e.target.value)}
                placeholder="输入 Bing API Key（可选）"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowBingKey(!showBingKey)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4,
                }}
              >
                {showBingKey ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
              配置后可在对话中启用联网搜索功能
            </p>
          </div>
        </div>

        {/* Appearance */}
        <div className="card">
          <div className="card-header">外观</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTheme(t)}
                style={{ flex: 1 }}
              >
                {t === 'dark' ? (
                  <><Moon size={14} strokeWidth={2} /> 深色</>
                ) : (
                  <><Sun size={14} strokeWidth={2} /> 浅色</>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reminder */}
        <div className="card">
          <div className="card-header">学习提醒</div>
          <div>
            <label className="label">每日提醒时间</label>
            <input className="input" type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
              每天固定时间推送今日学习任务
            </p>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 4 }}>
          <button className="btn btn-success btn-lg" onClick={handleSave} style={{ flex: 1, maxWidth: 200 }}>
            <Save size={14} strokeWidth={2.5} />
            保存设置
          </button>
          {saved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-green)', fontSize: 13, animation: 'fadeIn 0.3s ease' }}>
                <Check size={14} strokeWidth={2.5} />
              设置已保存
            </span>
          )}
        </div>

        {/* About */}
        <div className="card" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>OmniMind Agent</span>
            <span className="badge badge-blue">v1.2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
