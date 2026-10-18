import { cloneElement, isValidElement, type ReactElement, type HTMLAttributes } from 'react';
export function Slot({ children, ...props }: HTMLAttributes<HTMLElement>) {
  return isValidElement(children)
    ? cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, props)
    : null;
}
