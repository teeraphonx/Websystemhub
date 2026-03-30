import type { FormEventHandler, ReactNode } from 'react';
import {
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AvatarCircle from './AvatarCircle';

interface AuthPanelProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  submitIcon: LucideIcon;
  accent?: 'primary' | 'admin';
  usernameLabel: string;
  usernamePlaceholder: string;
  username: string;
  usernameType?: 'text' | 'email';
  usernameAutoComplete?: string;
  onUsernameChange: (value: string) => void;
  secondaryFieldLabel?: string;
  secondaryFieldPlaceholder?: string;
  secondaryFieldValue?: string;
  secondaryFieldType?: 'text' | 'email';
  secondaryFieldAutoComplete?: string;
  onSecondaryFieldChange?: (value: string) => void;
  extraPasswordLabel?: string;
  extraPassword?: string;
  extraPasswordAutoComplete?: string;
  onExtraPasswordChange?: (value: string) => void;
  showExtraPassword?: boolean;
  onToggleExtraPassword?: () => void;
  showExtraPasswordField?: boolean;
  passwordLabel?: string;
  password: string;
  passwordAutoComplete?: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  confirmPassword: string;
  confirmPasswordAutoComplete?: string;
  onConfirmPasswordChange: (value: string) => void;
  showConfirmPassword: boolean;
  onToggleConfirmPassword: () => void;
  showPasswordField?: boolean;
  showConfirmPasswordField?: boolean;
  showRememberRow?: boolean;
  rememberMe?: boolean;
  onToggleRememberMe?: () => void;
  showForgotPasswordLink?: boolean;
  onForgotPassword?: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting?: boolean;
  footer?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  visible: boolean;
  autoComplete?: string;
  disabled?: boolean;
  delayClass?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}

interface TextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  type?: 'text' | 'email';
  autoComplete?: string;
  disabled?: boolean;
  icon: LucideIcon;
  delayClass?: string;
  onChange: (value: string) => void;
}

function TextField({
  label,
  placeholder,
  value,
  type = 'text',
  autoComplete,
  disabled = false,
  icon: Icon,
  delayClass = 'delay-200',
  onChange,
}: TextFieldProps) {
  return (
    <div className={`space-y-2 text-left animate-fade-up group ${delayClass}`}>
      <label className="ml-1 flex items-center space-x-3 text-[13px] font-bold uppercase tracking-widest text-gray-500 transition-colors group-focus-within:text-[var(--systemhub-accent)]">
        <Icon size={14} />
        <span>{label}</span>
      </label>
      <div className="flex gap-2">
        <input
          type={type}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="systemhub-auth-input flex-1 rounded-xl px-5 py-3.5 text-[14px] text-white outline-none transition-all disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  visible,
  autoComplete,
  disabled = false,
  delayClass = 'delay-300',
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div className={`space-y-2 text-left animate-fade-up group ${delayClass}`}>
      <label className="ml-1 flex items-center space-x-3 text-[13px] font-bold uppercase tracking-widest text-gray-500 transition-colors group-focus-within:text-[var(--systemhub-accent)]">
        <Lock size={14} />
        <span>{label}</span>
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          className="systemhub-auth-input w-full rounded-xl px-5 py-3.5 pr-12 text-[14px] tracking-[0.2em] text-white outline-none transition-all disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function AuthPanel({
  title,
  subtitle,
  submitLabel,
  submitIcon: SubmitIcon,
  accent = 'primary',
  usernameLabel,
  usernamePlaceholder,
  username,
  usernameType = 'text',
  usernameAutoComplete,
  onUsernameChange,
  secondaryFieldLabel,
  secondaryFieldPlaceholder,
  secondaryFieldValue = '',
  secondaryFieldType = 'text',
  secondaryFieldAutoComplete,
  onSecondaryFieldChange,
  extraPasswordLabel,
  extraPassword = '',
  extraPasswordAutoComplete,
  onExtraPasswordChange,
  showExtraPassword = false,
  onToggleExtraPassword,
  showExtraPasswordField = false,
  passwordLabel = 'รหัสผ่าน',
  password,
  passwordAutoComplete,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  confirmPassword,
  confirmPasswordAutoComplete,
  onConfirmPasswordChange,
  showConfirmPassword,
  onToggleConfirmPassword,
  showPasswordField = true,
  showConfirmPasswordField = false,
  showRememberRow = false,
  rememberMe = false,
  onToggleRememberMe,
  showForgotPasswordLink = false,
  onForgotPassword,
  onSubmit,
  isSubmitting = false,
  footer,
  backLabel,
  onBack,
}: AuthPanelProps) {
  const submitButtonClass =
    accent === 'admin' ? 'systemhub-auth-admin-btn' : 'systemhub-auth-primary-btn';

  return (
    <div className="systemhub-auth-panel relative z-10 w-full max-w-[440px] animate-fade-up rounded-3xl p-10 backdrop-blur-2xl">
      <div className="mb-10 flex flex-col items-center text-center animate-fade-up delay-100">
        <AvatarCircle />
        <h1 className="mb-1 text-2xl font-black uppercase tracking-[0.2em] text-white">
          {title}
        </h1>
        <p className="text-[14px] font-medium text-gray-400">{subtitle}</p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <TextField
          label={usernameLabel}
          placeholder={usernamePlaceholder}
          value={username}
          type={usernameType}
          autoComplete={usernameAutoComplete}
          disabled={isSubmitting}
          icon={User}
          onChange={onUsernameChange}
        />

        {secondaryFieldLabel && secondaryFieldPlaceholder && onSecondaryFieldChange && (
          <TextField
            label={secondaryFieldLabel}
            placeholder={secondaryFieldPlaceholder}
            value={secondaryFieldValue}
            type={secondaryFieldType}
            autoComplete={secondaryFieldAutoComplete}
            disabled={isSubmitting}
            icon={Mail}
            delayClass="delay-[250ms]"
            onChange={onSecondaryFieldChange}
          />
        )}

        {showExtraPasswordField && extraPasswordLabel && onExtraPasswordChange && onToggleExtraPassword && (
          <PasswordField
            label={extraPasswordLabel}
            value={extraPassword}
            visible={showExtraPassword}
            autoComplete={extraPasswordAutoComplete}
            disabled={isSubmitting}
            delayClass="delay-[275ms]"
            onChange={onExtraPasswordChange}
            onToggle={onToggleExtraPassword}
          />
        )}

        {showPasswordField && (
          <>
            <PasswordField
              label={passwordLabel}
              value={password}
              visible={showPassword}
              autoComplete={passwordAutoComplete}
              disabled={isSubmitting}
              delayClass={showExtraPasswordField ? 'delay-[325ms]' : 'delay-300'}
              onChange={onPasswordChange}
              onToggle={onTogglePassword}
            />

            {showRememberRow && (
              <div className="flex items-center justify-between px-1 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onToggleRememberMe}
                  className="group flex items-center gap-2.5 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className={`flex h-[18px] w-[18px] items-center justify-center rounded-md border-[1.5px] transition-all ${rememberMe ? 'border-[var(--systemhub-primary)] bg-[var(--systemhub-primary)]' : 'border-[#475569] bg-transparent group-hover:border-[var(--systemhub-accent)]'}`}>
                    {rememberMe && <Check size={13} className="text-white" strokeWidth={4} />}
                  </div>
                  <span className="text-[13px] font-medium text-[#94a3b8] transition-colors group-hover:text-gray-200">
                    จดจำฉันไว้
                  </span>
                </button>
                {showForgotPasswordLink && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onForgotPassword}
                    className="systemhub-auth-link text-[12px] font-bold transition-colors hover:underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {showConfirmPasswordField && (
          <div className="space-y-2 text-left animate-fade-up delay-400 group">
            <label className="ml-1 flex items-center space-x-3 text-[13px] font-bold uppercase tracking-widest text-gray-500 transition-colors group-focus-within:text-[var(--systemhub-accent)]">
              <Lock size={14} />
              <span>ยืนยันรหัสผ่าน</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                autoComplete={confirmPasswordAutoComplete}
                disabled={isSubmitting}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                placeholder="••••••••"
                className="systemhub-auth-input w-full rounded-xl px-5 py-3.5 pr-12 text-[14px] tracking-[0.2em] text-white outline-none transition-all disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onToggleConfirmPassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        <div className={`pt-4 animate-fade-up delay-${showConfirmPasswordField ? '500' : '400'}`}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${submitButtonClass} w-full rounded-xl py-4 text-[15px] font-black uppercase tracking-widest text-white transition-all disabled:cursor-not-allowed disabled:opacity-70 ${isSubmitting ? '' : 'active:scale-[0.98] hover:-translate-y-1'}`}
          >
            <span className="flex items-center justify-center space-x-3">
              <SubmitIcon size={18} />
              <span>{isSubmitting ? 'กำลังดำเนินการ...' : submitLabel}</span>
            </span>
          </button>
        </div>
      </form>

      {footer && <div className="mt-10 text-center animate-fade-up delay-500">{footer}</div>}

      {onBack && backLabel && (
        <div className="mt-8 text-center animate-fade-up delay-500">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBack}
            className="group mx-auto flex items-center justify-center gap-2 text-[13px] font-bold text-gray-400 transition-all hover:-translate-x-1 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ChevronLeft size={16} /> {backLabel}
          </button>
        </div>
      )}
    </div>
  );
}
