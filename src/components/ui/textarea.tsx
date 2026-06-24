import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-none transition-all",
          "placeholder:text-slate-400",
          "hover:border-slate-300",
          "focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
