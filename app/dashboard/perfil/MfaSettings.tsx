'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { enrollTotp, verifyEnrollment, unenrollFactor, listFactors } from '@/lib/mfa'

type Step = 'idle' | 'qr' | 'verify' | 'success'
interface Factor { id: string; status: string }

export default function MfaSettings() {
  const [step, setStep] = useState<Step>('idle')
  const [enrollData, setEnrollData] = useState<{ id: string; totp: { secret: string; uri: string } } | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeFactor, setActiveFactor] = useState<Factor | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [disableConfirm, setDisableConfirm] = useState(false)

  useEffect(() => { loadFactors() }, [])

  async function loadFactors() {
    try {
      const factors = await listFactors()
      setActiveFactor(factors.totp?.find((f: Factor) => f.status === 'verified') ?? null)
    } catch {}
  }

  async function handleEnable() {
    setLoading(true); setError('')
    try { const data = await enrollTotp(); setEnrollData(data as any); setStep('qr') }
    catch { setError('Erro ao iniciar configuração. Tente novamente.') }
    finally { setLoading(false) }
  }

  async function handleVerify() {
    if (!enrollData || code.length !== 6) return
    setLoading(true); setError('')
    try { await verifyEnrollment(enrollData.id, code); setStep('success'); await loadFactors() }
    catch { setError('Código incorreto. Verifique o app e tente novamente.') }
    finally { setLoading(false) }
  }

  async function handleDisable() {
    if (!activeFactor) return
    setLoading(true); setError('')
    try { await unenrollFactor(activeFactor.id); setActiveFactor(null); setDisableConfirm(false); setStep('idle') }
    catch { setError('Erro ao desativar 2FA.') }
    finally { setLoading(false) }
  }

  function reset() { setStep('idle'); setEnrollData(null); setCode(''); setError(''); setShowSecret(false) }

  return (
    <div className="mfa-settings">
      <div className="mfa-header">
        <div className="mfa-header-icon">{activeFactor ? '🛡️' : '🔒'}</div>
        <div>
          <h2 className="mfa-heading">Autenticação em duas etapas</h2>
          <p className="mfa-desc">{activeFactor ? 'Sua conta está protegida com 2FA.' : 'Adicione uma camada extra de segurança.'}</p>
        </div>
        <div className={`mfa-badge ${activeFactor ? 'mfa-badge--on' : 'mfa-badge--off'}`}>{activeFactor ? 'Ativo' : 'Inativo'}</div>
      </div>
      {error && <div className="mfa-alert">{error}</div>}
      {step === 'idle' && !activeFactor && (
        <div className="mfa-section">
          <ul className="mfa-benefits">
            <li>✓ Protege mesmo se sua senha for comprometida</li>
            <li>✓ Compatível com Google Authenticator, Authy e 1Password</li>
            <li>✓ Leva menos de 2 minutos para configurar</li>
          </ul>
          <button className="mfa-btn mfa-btn--primary" onClick={handleEnable} disabled={loading}>{loading ? <span className="spinner" /> : 'Ativar 2FA'}</button>
        </div>
      )}
      {activeFactor && step === 'idle' && (
        <div className="mfa-section">
          <div className="mfa-active-info"><span className="mfa-check">✓</span><span>App autenticador configurado</span></div>
          {!disableConfirm
            ? <button className="mfa-btn mfa-btn--danger-outline" onClick={() => setDisableConfirm(true)}>Desativar 2FA</button>
            : <div className="mfa-confirm">
                <p>Tem certeza? Sua conta ficará menos segura.</p>
                <div className="mfa-confirm-actions">
                  <button className="mfa-btn mfa-btn--ghost" onClick={() => setDisableConfirm(false)}>Cancelar</button>
                  <button className="mfa-btn mfa-btn--danger" onClick={handleDisable} disabled={loading}>{loading ? <span className="spinner" /> : 'Sim, desativar'}</button>
                </div>
              </div>
          }
        </div>
      )}
      {step === 'qr' && enrollData && (
        <div className="mfa-section">
          <div className="mfa-steps"><div className="mfa-step mfa-step--active">1</div><div className="mfa-step-line" /><div className="mfa-step">2</div></div>
          <p className="mfa-instruction">Escaneie o QR code no seu app autenticador:</p>
          <div className="mfa-qr"><QRCodeSVG value={enrollData.totp.uri} size={180} bgColor="#fff" fgColor="#1a3a1a" level="M" /></div>
          <button className="mfa-secret-toggle" onClick={() => setShowSecret(!showSecret)}>{showSecret ? 'Ocultar' : 'Não consigo escanear — mostrar código manual'}</button>
          {showSecret && <div className="mfa-secret"><code>{enrollData.totp.secret}</code></div>}
          <div className="mfa-row">
            <button className="mfa-btn mfa-btn--ghost" onClick={reset}>Cancelar</button>
            <button className="mfa-btn mfa-btn--primary" onClick={() => setStep('verify')}>Já escaneei →</button>
          </div>
        </div>
      )}
      {step === 'verify' && (
        <div className="mfa-section">
          <div className="mfa-steps"><div className="mfa-step mfa-step--done">✓</div><div className="mfa-step-line mfa-step-line--done" /><div className="mfa-step mfa-step--active">2</div></div>
          <p className="mfa-instruction">Digite o código de 6 dígitos para confirmar:</p>
          <input className="mfa-code-input" type="text" inputMode="numeric" maxLength={6} value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }} placeholder="000000" autoFocus />
          <div className="mfa-row">
            <button className="mfa-btn mfa-btn--ghost" onClick={() => setStep('qr')}>← Voltar</button>
            <button className="mfa-btn mfa-btn--primary" onClick={handleVerify} disabled={code.length !== 6 || loading}>{loading ? <span className="spinner" /> : 'Confirmar'}</button>
          </div>
        </div>
      )}
      {step === 'success' && (
        <div className="mfa-section mfa-success">
          <div className="mfa-success-icon">🎉</div>
          <h3>2FA ativado com sucesso!</h3>
          <p>A partir de agora, você precisará do código ao fazer login.</p>
          <button className="mfa-btn mfa-btn--primary" onClick={reset}>Concluir</button>
        </div>
      )}
      <style>{`
        .mfa-settings{font-family:'Nunito',sans-serif;max-width:560px}
        .mfa-header{display:flex;align-items:flex-start;gap:16px;padding:24px;background:#f8fdf8;border-radius:16px;border:1px solid #e0f0e0;margin-bottom:24px}
        .mfa-header-icon{font-size:32px;line-height:1}
        .mfa-heading{font-size:18px;font-weight:800;color:#1a3a1a;margin:0 0 4px}
        .mfa-desc{font-size:14px;color:#555;margin:0}
        .mfa-badge{margin-left:auto;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700;white-space:nowrap}
        .mfa-badge--on{background:#e6f9ee;color:#00a844}
        .mfa-badge--off{background:#f5f5f5;color:#999}
        .mfa-alert{background:#fef3f3;border:1px solid #f5c6c6;color:#c62828;padding:12px 16px;border-radius:10px;font-size:14px;margin-bottom:16px}
        .mfa-section{display:flex;flex-direction:column;gap:16px}
        .mfa-benefits{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
        .mfa-benefits li{font-size:14px;color:#444}
        .mfa-btn{padding:13px 24px;border-radius:10px;font-size:15px;font-weight:700;border:none;cursor:pointer;font-family:'Nunito',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s}
        .mfa-btn:disabled{opacity:0.5;cursor:not-allowed}
        .mfa-btn--primary{background:#00C853;color:#fff}
        .mfa-btn--primary:hover:not(:disabled){background:#00a844}
        .mfa-btn--ghost{background:#f0f0f0;color:#333}
        .mfa-btn--ghost:hover{background:#e4e4e4}
        .mfa-btn--danger{background:#f44336;color:#fff}
        .mfa-btn--danger:hover:not(:disabled){background:#d32f2f}
        .mfa-btn--danger-outline{background:transparent;color:#f44336;border:2px solid #f44336}
        .mfa-btn--danger-outline:hover{background:#fef3f3}
        .mfa-active-info{display:flex;align-items:center;gap:10px;font-size:15px;color:#1a3a1a;font-weight:600}
        .mfa-check{width:28px;height:28px;background:#e6f9ee;color:#00a844;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
        .mfa-confirm{background:#fff8f8;border:1px solid #f5c6c6;padding:16px;border-radius:12px}
        .mfa-confirm p{margin:0 0 12px;font-size:14px;color:#c62828}
        .mfa-confirm-actions{display:flex;gap:10px}
        .mfa-steps{display:flex;align-items:center;gap:8px}
        .mfa-step{width:32px;height:32px;border-radius:50%;background:#e0e0e0;color:#999;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .mfa-step--active{background:#00C853;color:#fff}
        .mfa-step--done{background:#1a3a1a;color:#fff}
        .mfa-step-line{flex:1;height:2px;background:#e0e0e0;border-radius:2px}
        .mfa-step-line--done{background:#1a3a1a}
        .mfa-instruction{font-size:14px;color:#444;margin:0}
        .mfa-qr{display:flex;align-items:center;justify-content:center;padding:20px;background:#fff;border:2px solid #e0f0e0;border-radius:16px}
        .mfa-secret-toggle{background:none;border:none;color:#00C853;font-size:13px;cursor:pointer;font-family:'Nunito',sans-serif;text-decoration:underline;padding:0;text-align:left}
        .mfa-secret{background:#f5f5f5;padding:12px 16px;border-radius:10px;font-size:15px;letter-spacing:2px;text-align:center;color:#1a3a1a}
        .mfa-code-input{width:100%;padding:16px;border:2px solid #e0e0e0;border-radius:12px;font-size:28px;font-weight:700;text-align:center;letter-spacing:8px;color:#1a3a1a;outline:none;font-family:'Nunito',sans-serif;transition:border-color 0.15s;box-sizing:border-box}
        .mfa-code-input:focus{border-color:#00C853}
        .mfa-row{display:flex;gap:12px}
        .mfa-row .mfa-btn{flex:1}
        .mfa-success{align-items:center;text-align:center;padding:16px 0}
        .mfa-success-icon{font-size:56px}
        .mfa-success h3{font-size:20px;font-weight:800;color:#1a3a1a;margin:0}
        .mfa-success p{font-size:14px;color:#555;margin:0}
        .spinner{width:18px;height:18px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
