import React from 'react';
import PropTypes from 'prop-types';

const variants = {
  default: 'bg-neutral-100 text-neutral-700',
  primary: 'bg-violet-100 text-violet-700',
  success: 'bg-green-100  text-green-700',
  warning: 'bg-amber-100  text-amber-700',
  danger:  'bg-red-100    text-red-700',
  info:    'bg-blue-100   text-blue-700',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs font-medium',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) {
  const dotColors = {
    default: 'bg-neutral-500',
    primary: 'bg-violet-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger:  'bg-red-500',
    info:    'bg-blue-500',
  };

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.md,
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={['h-1.5 w-1.5 rounded-full', dotColors[variant]].join(' ')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant:  PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'info']),
  size:     PropTypes.oneOf(['sm', 'md']),
  dot:      PropTypes.bool,
  className: PropTypes.string,
};
