import React from 'react';
import PropTypes from 'prop-types';

export default function Card({
  children,
  title,
  description,
  footer,
  padding = 'md',
  shadow = true,
  border = true,
  className = '',
}) {
  const paddings = { sm: 'p-3', md: 'p-5', lg: 'p-7', none: '' };

  return (
    <div
      className={[
        'rounded-xl bg-white',
        border  ? 'border border-neutral-200' : '',
        shadow  ? 'shadow-sm' : '',
        paddings[padding] ?? paddings.md,
        className,
      ].join(' ')}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-neutral-500">{description}</p>
          )}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div className="mt-4 border-t border-neutral-100 pt-4 text-sm text-neutral-500">
          {footer}
        </div>
      )}
    </div>
  );
}

Card.propTypes = {
  children:    PropTypes.node.isRequired,
  title:       PropTypes.string,
  description: PropTypes.string,
  footer:      PropTypes.node,
  padding:     PropTypes.oneOf(['sm', 'md', 'lg', 'none']),
  shadow:      PropTypes.bool,
  border:      PropTypes.bool,
  className:   PropTypes.string,
};
