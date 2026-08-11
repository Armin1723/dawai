import { useId, cloneElement, isValidElement } from "react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label?: ReactNode;
  /** Optional explicit control id; a stable one is generated when omitted. */
  htmlFor?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Standard form field: label above, control, optional hint. Matches FormLabel's voice.
 * The label is wired to the control via an auto-generated id (the control receives
 * the same id through a clone), so clicking the label focuses the input.
 */
export function Field({ label, htmlFor, hint, required, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = htmlFor ?? generatedId;

  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string }>, { id: controlId })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={controlId} className="text-[13px] font-medium text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {control}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
