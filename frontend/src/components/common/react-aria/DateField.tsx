import { Description, FieldError, fieldGroupStyles,Label } from '@components/common/react-aria/Field';
import { composeTailwindRenderProps } from '@components/common/react-aria/utils';
import {
  DateField as AriaDateField,
  type DateFieldProps as AriaDateFieldProps,
  DateInput as AriaDateInput,
  type DateInputProps,
  DateSegment,
  type DateValue,
  type ValidationResult
} from 'react-aria-components/DateField';
import { tv } from 'tailwind-variants';

export interface DateFieldProps<T extends DateValue> extends AriaDateFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DateField<T extends DateValue>(
  { label, description, errorMessage, ...props }: DateFieldProps<T>
) {
  return (
    <AriaDateField {...props} className={composeTailwindRenderProps(props.className, 'flex flex-col gap-1')}>
      {label && <Label>{label}</Label>}
      <DateInput />
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </AriaDateField>
  );
}

const segmentStyles = tv({
  base: 'inline p-0.5 whitespace-nowrap type-literal:p-0 type-literal:text-gray-300 rounded-sm outline-0 caret-transparent text-gray-700 [-webkit-tap-highlight-color:transparent]',
  variants: {
    isPlaceholder: {
      true: 'text-gray-600'
    },
    isDisabled: {
      true: 'text-gray-300'
    },
    isFocused: {
      true: 'bg-blue-600 text-white outline-none focus:outline-none'
    }
  }
});

export function DateInput(props: Omit<DateInputProps, 'children'>) {
  return (
    <AriaDateInput className={renderProps => fieldGroupStyles({
      ...renderProps,
      class: 'inline min-w-[150px] px-2 h-8 text-xs leading-8 cursor-text whitespace-nowrap overflow-x-auto [scrollbar-width:none]'
    })} {...props}>
      {(segment) => <DateSegment segment={segment} className={segmentStyles} />}
    </AriaDateInput>
  );
}
