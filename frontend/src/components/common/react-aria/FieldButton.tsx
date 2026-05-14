// import { focusRing } from '@components/common/react-aria/utils';
import { Button as RACButton, type ButtonProps as RACButtonProps } from 'react-aria-components/Button';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import { tv } from 'tailwind-variants';

export interface ButtonProps extends RACButtonProps {
  /** @default 'primary' */
  variant?: 'primary' | 'secondary' | 'destructive' | 'icon'
}

let button = tv({
  base: 'relative inline-flex items-center border-0 text-sm text-center transition rounded-md cursor-default p-1 flex items-center justify-center text-gray-600 bg-transparent hover:bg-gray-100 hover:text-blue-600 pressed:bg-gray-200 disabled:bg-transparent [-webkit-tap-highlight-color:transparent]',
  variants: {
    isDisabled: {
      true: 'bg-transparent text-gray-300'
    }
  }
});

export function FieldButton(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(
        props.className,
        (className, renderProps) => button({
          ...renderProps,
          className 
        })
      )}
    >
      {props.children}
    </RACButton>
  );
}
