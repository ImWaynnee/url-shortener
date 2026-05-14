import { Calendar } from '@components/common/react-aria/Calendar';
import { DateInput } from '@components/common/react-aria/DateField';
import { Description, FieldError, FieldGroup, Label } from '@components/common/react-aria/Field';
import { FieldButton } from '@components/common/react-aria/FieldButton';
import { Popover } from '@components/common/react-aria/Popover';
import { composeTailwindRenderProps } from '@components/common/react-aria/utils';
import { CalendarIcon } from 'lucide-react';
import {
  DatePicker as AriaDatePicker,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
  type ValidationResult
} from 'react-aria-components/DatePicker';

export interface DatePickerProps<T extends DateValue>
  extends AriaDatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DateTimePicker<T extends DateValue>(
  { label, description, errorMessage, ...props }: DatePickerProps<T>
) {
  return (
    <AriaDatePicker {...props} className={composeTailwindRenderProps(props.className, 'group flex flex-col gap-1')}>
      {label && <Label>{label}</Label>}
      <FieldGroup className="w-auto cursor-text disabled:cursor-default">
        <DateInput className="flex-1 min-w-[150px] px-2 text-xs" />
        <FieldButton className="w-6 mr-1 outline-offset-0">
          <CalendarIcon aria-hidden className="w-3.5 h-3.5" />
        </FieldButton>
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="p-2">
        <Calendar />
      </Popover>
    </AriaDatePicker>
  );
}
