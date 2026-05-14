import { Button } from '@components/common/react-aria/Button';
import { composeTailwindRenderProps, focusRing } from '@components/common/react-aria/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarHeaderCell,
  type CalendarProps as AriaCalendarProps,
  type DateValue,
  Heading,
  Text
} from 'react-aria-components/Calendar';
import { useLocale } from 'react-aria-components/I18nProvider';
import { tv } from 'tailwind-variants';

const cellStyles = tv({
  extend: focusRing,
  base: 'w-[calc(100cqw/7)] aspect-square text-xs cursor-default rounded-full flex items-center justify-center [-webkit-tap-highlight-color:transparent]',
  variants: {
    isSelected: {
      false: 'text-gray-700 hover:bg-gray-100 pressed:bg-gray-200',
      true: 'bg-blue-600 text-white'
    },
    isDisabled: {
      true: 'text-gray-300'
    }
  }
});

export interface CalendarProps<T extends DateValue> extends Omit<AriaCalendarProps<T>, 'visibleDuration'> {
  errorMessage?: string;
}

export function Calendar<T extends DateValue>(
  { errorMessage, ...props }: CalendarProps<T>
) {
  return (
    <AriaCalendar {...props} className={composeTailwindRenderProps(props.className, 'flex flex-col w-60 @container')}>
      <CalendarHeader />
      <CalendarGrid className="border-spacing-0 w-full">
        <CalendarGridHeader />
        <CalendarGridBody>
          {(date) => <CalendarCell date={date} className={cellStyles} />}
        </CalendarGridBody>
      </CalendarGrid>
      {errorMessage && <Text slot="errorMessage" className="text-sm text-red-600">{errorMessage}</Text>}
    </AriaCalendar>
  );
}

export function CalendarHeader() {
  let { direction } = useLocale();

  return (
    <header className="flex items-center gap-1 pb-4 px-1 border-box">
      <Button variant="quiet" slot="previous">
        {direction === 'rtl' ? <ChevronRight aria-hidden size={18} /> : <ChevronLeft aria-hidden size={18} />}
      </Button>
      <Heading className="flex-1 font-semibold text-sm text-center text-gray-800" />
      <Button variant="quiet" slot="next">
        {direction === 'rtl' ? <ChevronLeft aria-hidden size={18} /> : <ChevronRight aria-hidden size={18} />}
      </Button>
    </header>
  );
}

export function CalendarGridHeader() {
  return (
    <AriaCalendarGridHeader>
      {(day) => (
        <CalendarHeaderCell className="text-[10px] text-gray-600 font-semibold">
          {day}
        </CalendarHeaderCell>
      )}
    </AriaCalendarGridHeader>
  );
}
