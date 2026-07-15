'use client';

import { useState } from 'react';

const TRADES = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'roofer', label: 'Roofer' },
];

const MARKET_TIERS = [
  { value: '', label: 'Auto-detect from city' },
  { value: 'booming', label: 'Booming' },
  { value: 'strong', label: 'Strong' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'slow', label: 'Slow' },
  { value: 'depressed', label: 'Depressed' },
];

const SCREEN_TITLES = [
  'Tell us about your business',
  'Your revenue and capacity',
  'A few more details',
];

const SCREEN_SUBTITLES = [
  'We use this to find your Google Business Profile and analyse your local presence.',
  'We use this to calculate your revenue gap and recovery potential.',
  'This helps us model your market opportunity accurately.',
];

const defaultForm = {
  // Screen 1
  businessName: '',
  city: '',
  websiteUrl: '',
  trade: 'plumber',
  // Screen 2
  annualRevenue: '',
  avgSaleValue: '',
  missedCallsPerMonth: '',
  capacityUtilization: '',
  // Screen 3
  yearsInBusiness: '',
  adminStaffCount: '',
  adminHoursPerWeek: '',
  marketTierOverride: '',
  totalTechnicians: '',
  avgBillableHoursPerDay: '',
  workingDaysPerYear: '',
};

function Label({ children, required }) {
  return (
    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#e8eaf0', fontFamily: 'DM Sans, sans-serif' }}>
      {children}
      {required && <span style={{ color: '#4a9eff', marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: '#1a1e28',
        border: '1px solid #2a2f3e',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 14,
        color: '#e8eaf0',
        fontFamily: 'DM Sans, sans-serif',
        outline: 'none',
      }}
      {...rest}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: '#1a1e28',
        border: '1px solid #2a2f3e',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 14,
        color: '#e8eaf0',
        fontFamily: 'DM Sans, sans-serif',
        outline: 'none',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function FieldGroup({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#7c8399', fontFamily: 'DM Sans, sans-serif' }}>{hint}</p>}
    </div>
  );
}

function ProgressBar({ screen }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i <= screen ? '#4a9eff' : '#2a2f3e',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );
}

export default function ClearSkyIntakeForm({ onSubmit, isLoading }) {
  const [screen, setScreen] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function validateScreen(s) {
    const errs = {};
    if (s === 0) {
      if (!form.businessName.trim()) errs.businessName = 'Required';
      if (!form.city.trim()) errs.city = 'Required';
      // websiteUrl is optional — no validation required
    }
    if (s === 1) {
      if (!form.annualRevenue) errs.annualRevenue = 'Required';
      if (!form.avgSaleValue) errs.avgSaleValue = 'Required';
      if (!form.missedCallsPerMonth) errs.missedCallsPerMonth = 'Required';
      if (!form.capacityUtilization) errs.capacityUtilization = 'Required';
    }
    if (s === 2) {
      if (!form.yearsInBusiness) errs.yearsInBusiness = 'Required';
      if (!form.totalTechnicians) errs.totalTechnicians = 'Required';
    }
    return errs;
  }

  function next() {
    const errs = validateScreen(screen);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setScreen(s => s + 1);
  }

  function back() {
    setErrors({});
    setScreen(s => s - 1);
  }

  function submit() {
    const errs = validateScreen(2);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    // Normalise websiteUrl — add https:// if scheme missing
    let websiteUrl = form.websiteUrl.trim();
    if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
      websiteUrl = 'https://' + websiteUrl;
    }

    onSubmit({
      business: {
        name: form.businessName.trim(),
        city: form.city.trim(),
        trade: form.trade,
        websiteUrl: websiteUrl || null,
      },
      revenue: {
        annualRevenue: Number(form.annualRevenue),
        avgSaleValue: Number(form.avgSaleValue),
        missedCallsPerMonth: Number(form.missedCallsPerMonth),
        capacityUtilization: Number(form.capacityUtilization) / 100,
      },
      operations: {
        yearsInBusiness: Number(form.yearsInBusiness) || 5,
        adminStaffCount: Number(form.adminStaffCount) || 0,
        adminHoursPerWeek: Number(form.adminHoursPerWeek) || 8,
        marketTierOverride: form.marketTierOverride || null,
        totalTechnicians: Number(form.totalTechnicians) || 1,
        avgBillableHoursPerDay: Number(form.avgBillableHoursPerDay) || 6,
        workingDaysPerYear: Number(form.workingDaysPerYear) || 250,
      },
    });
  }

  const err = (f) => errors[f]
    ? <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ff5c72', fontFamily: 'DM Sans, sans-serif' }}>{errors[f]}</p>
    : null;

  const btnStyle = (primary) => ({
    padding: '11px 24px',
    borderRadius: 6,
    border: primary ? 'none' : '1px solid #2a2f3e',
    background: primary ? '#4a9eff' : 'transparent',
    color: primary ? '#fff' : '#7c8399',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading && primary ? 0.7 : 1,
  });

  return (
    <div style={{
      background: '#0c0e12',
      border: '1px solid #2a2f3e',
      borderRadius: 12,
      padding: '32px 28px',
      maxWidth: 480,
      width: '100%',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #4a9eff 0%, #2563eb 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: '#fff',
          }}>CS</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: '#e8eaf0' }}>ClearSky</span>
        </div>
        <ProgressBar screen={screen} />
        <p style={{ margin: '0 0 2px', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4a5168', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Step {screen + 1} of 3
        </p>
        <h2 style={{ margin: '4px 0 6px', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#e8eaf0' }}>
          {SCREEN_TITLES[screen]}
        </h2>
        <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#7c8399', lineHeight: 1.5 }}>
          {SCREEN_SUBTITLES[screen]}
        </p>
      </div>

      {/* Screen 1 */}
      {screen === 0 && (
        <div>
          <FieldGroup label="Business name" required>
            <Input value={form.businessName} onChange={set('businessName')} placeholder="e.g. Rempel Plumbing & Heating" />
            {err('businessName')}
          </FieldGroup>

          <FieldGroup label="City" required>
            <Input value={form.city} onChange={set('city')} placeholder="e.g. Timmins" />
            {err('city')}
          </FieldGroup>

          <FieldGroup label="Website URL" hint="Optional — used to analyse your site performance. Leave blank if you don't have a website.">
            <Input
              value={form.websiteUrl}
              onChange={set('websiteUrl')}
              placeholder="e.g. rempelplumbing.ca"
              type="url"
            />
          </FieldGroup>

          <FieldGroup label="Trade" required>
            <Select value={form.trade} onChange={set('trade')} options={TRADES} />
          </FieldGroup>
        </div>
      )}

      {/* Screen 2 */}
      {screen === 1 && (
        <div>
          <FieldGroup label="Annual revenue ($)" required hint="Your best estimate is fine.">
            <Input value={form.annualRevenue} onChange={set('annualRevenue')} placeholder="e.g. 480000" type="number" min="0" />
            {err('annualRevenue')}
          </FieldGroup>

          <FieldGroup label="Average job value ($)" required>
            <Input value={form.avgSaleValue} onChange={set('avgSaleValue')} placeholder="e.g. 850" type="number" min="0" />
            {err('avgSaleValue')}
          </FieldGroup>

          <FieldGroup label="Missed calls per month" required hint="Calls that go to voicemail or are not answered.">
            <Input value={form.missedCallsPerMonth} onChange={set('missedCallsPerMonth')} placeholder="e.g. 12" type="number" min="0" />
            {err('missedCallsPerMonth')}
          </FieldGroup>

          <FieldGroup label="Current capacity utilization (%)" required hint="How busy are your technicians on average? 100% = fully booked.">
            <Input value={form.capacityUtilization} onChange={set('capacityUtilization')} placeholder="e.g. 75" type="number" min="0" max="100" />
            {err('capacityUtilization')}
          </FieldGroup>
        </div>
      )}

      {/* Screen 3 */}
      {screen === 2 && (
        <div>
          <FieldGroup label="Years in business" required>
            <Input value={form.yearsInBusiness} onChange={set('yearsInBusiness')} placeholder="e.g. 12" type="number" min="0" />
            {err('yearsInBusiness')}
          </FieldGroup>

          <FieldGroup label="Number of technicians" required>
            <Input value={form.totalTechnicians} onChange={set('totalTechnicians')} placeholder="e.g. 3" type="number" min="1" />
            {err('totalTechnicians')}
          </FieldGroup>

          <FieldGroup label="Average billable hours per day" hint="Per technician. Default is 6.">
            <Input value={form.avgBillableHoursPerDay} onChange={set('avgBillableHoursPerDay')} placeholder="e.g. 6" type="number" min="0" max="12" />
          </FieldGroup>

          <FieldGroup label="Working days per year" hint="Default is 250.">
            <Input value={form.workingDaysPerYear} onChange={set('workingDaysPerYear')} placeholder="e.g. 250" type="number" min="0" />
          </FieldGroup>

          <FieldGroup label="Admin staff count" hint="Staff who spend time on scheduling, invoicing, or admin.">
            <Input value={form.adminStaffCount} onChange={set('adminStaffCount')} placeholder="e.g. 1" type="number" min="0" />
          </FieldGroup>

          <FieldGroup label="Admin hours per week" hint="Total admin hours across all admin staff. Default is 8.">
            <Input value={form.adminHoursPerWeek} onChange={set('adminHoursPerWeek')} placeholder="e.g. 8" type="number" min="0" />
          </FieldGroup>

          <FieldGroup label="Market tier override" hint="Leave on auto-detect unless you know your market tier.">
            <Select value={form.marketTierOverride} onChange={set('marketTierOverride')} options={MARKET_TIERS} />
          </FieldGroup>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
        {screen > 0
          ? <button style={btnStyle(false)} onClick={back} disabled={isLoading}>Back</button>
          : <div />
        }
        {screen < 2
          ? <button style={btnStyle(true)} onClick={next}>Continue</button>
          : (
            <button style={btnStyle(true)} onClick={submit} disabled={isLoading}>
              {isLoading ? 'Running diagnostic…' : 'Run diagnostic'}
            </button>
          )
        }
      </div>
    </div>
  );
}
