import { composeTailwindRenderProps } from "@components/common/react-aria/utils";
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import { FieldError as RACFieldError,type FieldErrorProps } from 'react-aria-components/FieldError';
import { Group, type GroupProps } from 'react-aria-components/Group';
import { Input as RACInput,type InputProps } from 'react-aria-components/Input';
import { Label as RACLabel,type LabelProps } from 'react-aria-components/Label';
import { Text, type TextProps } from 'react-aria-components/Text';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';

export function Label(props: LabelProps) {
  return <RACLabel {...props} className={twMerge('text-xs font-medium text-gray-500 cursor-default w-fit', props.className)} />;
}

export function Description(props: TextProps) {
  return <Text {...props} slot="description" className={twMerge('text-xs text-gray-500', props.className)} />;
}

export function FieldError(props: FieldErrorProps) {
  return <RACFieldError {...props} className={composeTailwindRenderProps(props.className, 'text-xs text-red-500')} />;
}

export const fieldBorderStyles = tv({
  base: 'transition',
  variants: {
    isFocusWithin: {
      false: 'border-gray-200 hover:border-gray-300',
      true: 'border-blue-400'
    },
    isInvalid: {
      true: 'border-red-500'
    },
    isDisabled: {
      true: 'border-gray-200 bg-gray-50'
    }
  }
});

export const fieldGroupStyles = tv({
  base: 'group flex items-center h-8 box-border bg-white border rounded-lg overflow-hidden transition outline-none',
  variants: fieldBorderStyles.variants
});

export function FieldGroup(props: GroupProps) {
  return <Group {...props} className={composeRenderProps(props.className, (className, renderProps) => fieldGroupStyles({
    ...renderProps,
    className
  }))} />;
}

export function Input(props: InputProps) {
  return <RACInput {...props} className={composeTailwindRenderProps(props.className, 'px-2 py-0 min-h-8 flex-1 min-w-0 border-0 outline-0 bg-white text-xs text-gray-700 placeholder:text-gray-600 disabled:text-gray-300 [-webkit-tap-highlight-color:transparent]')} />;
}
