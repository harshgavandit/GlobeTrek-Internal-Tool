import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 min-w-0 w-full rounded-md border border-input bg-white px-3 py-2 text-base sm:h-9 sm:text-[13px] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 hover:border-slate-400 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0 aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-500/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
