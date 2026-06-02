import  { forwardRef } from 'react';
import PropTypes from 'prop-types';

const Input = forwardRef(function Input(
  {
    label,
    id,
    type = 'text',
    placeholder = '',
    error = '',
    hint = '',
    required = false,
    disabled = false,
    className = '',
    ...rest
  },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={['flex flex-col gap-1', className].join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-neutral-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={!!error}
        className={[
          'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'bg-white text-neutral-900 placeholder-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
          'disabled:bg-neutral-50 disabled:opacity-60 disabled:cursor-not-allowed',
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-neutral-300 hover:border-neutral-400',
        ].join(' ')}
        {...rest}
      />

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.propTypes = {
  label:       PropTypes.string,
  id:          PropTypes.string,
  type:        PropTypes.string,
  placeholder: PropTypes.string,
  error:       PropTypes.string,
  hint:        PropTypes.string,
  required:    PropTypes.bool,
  disabled:    PropTypes.bool,
  className:   PropTypes.string,
};

export default Input;
