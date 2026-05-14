import { focusRing } from '@components/common/react-aria/utils';
import { Button as RACButton, type ButtonProps as RACButtonProps } from 'react-aria-components/Button';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import { tv } from 'tailwind-variants';

export interface ButtonProps extends RACButtonProps {
  /** @default 'primary' */
  variant?: 'primary' | 'secondary' | 'destructive' | 'quiet'
}

let button = tv({
  extend: focusRing,
  base: 'relative inline-flex items-center justify-center gap-2 border border-transparent h-9 box-border px-3.5 py-0 [&:has(>svg:only-child)]:px-0 [&:has(>svg:only-child)]:h-8 [&:has(>svg:only-child)]:w-8 text-sm text-center transition rounded-lg cursor-default [-webkit-tap-highlight-color:transparent]',
  variants: {
    variant: {
      primary: 'bg-blue-600 hover:bg-blue-700 pressed:bg-blue-800 text-white',
      secondary: 'border-gray-200 bg-white hover:bg-gray-50 pressed:bg-gray-100 text-gray-700',
      destructive: 'bg-red-600 hover:bg-red-700 pressed:bg-red-800 text-white',
      quiet: 'border-0 bg-transparent hover:bg-gray-100 pressed:bg-gray-200 text-gray-600'
    },
    isDisabled: {
      true: 'border-transparent bg-gray-100 text-gray-300'
    },
    isPending: {
      true: 'text-transparent'
    }
  },
  defaultVariants: {
    variant: 'primary'
  },
  compoundVariants: [
    {
      variant: 'quiet',
      isDisabled: true,
      class: 'bg-transparent'
    }
  ]
});

export function Button(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => button({
          ...renderProps,
          variant: props.variant,
          className
        })
      )}
    >
      {composeRenderProps(props.children, (children, { isPending }) => (
        <>
          {children}
          {isPending && (
            <span aria-hidden className="flex absolute inset-0 justify-center items-center">
              <svg className="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" stroke={props.variant === 'secondary' || props.variant === 'quiet' ? 'light-dark(black, white)' : 'white'}>
                <circle cx="12" cy="12" r="10" strokeWidth="4" fill="none" className="opacity-25" />
                <circle cx="12" cy="12" r="10" strokeWidth="4" strokeLinecap="round" fill="none" pathLength="100" strokeDasharray="60 140" strokeDashoffset="0" />
              </svg>
            </span>
          )}
        </>
      ))}
    </RACButton>
  );
}
