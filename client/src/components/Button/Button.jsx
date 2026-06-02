import PropTypes from 'prop-types';

const variants = {
  primary:   'bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500',
  secondary: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 focus-visible:ring-neutral-400',
  danger:    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400',
  ghost:     'bg-transparent text-violet-600 hover:bg-violet-50 focus-visible:ring-violet-400',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

Button.propTypes = {
  children:  PropTypes.node.isRequired,
  variant:   PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size:      PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled:  PropTypes.bool,
  loading:   PropTypes.bool,
  type:      PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
  onClick:   PropTypes.func,
};
