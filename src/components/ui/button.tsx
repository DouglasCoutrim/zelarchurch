import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13.5px] font-medium cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1B3A6B] text-white shadow-[0_1px_3px_rgba(27,58,107,0.3)] hover:bg-[#0F2347] hover:-translate-y-px active:translate-y-0",
        navy:
          "bg-[#1B3A6B] text-white shadow-[0_1px_3px_rgba(27,58,107,0.3)] hover:bg-[#0F2347] hover:-translate-y-px active:translate-y-0",
        gold:
          "bg-[#C49A2A] text-white shadow-[0_1px_3px_rgba(196,154,42,0.35)] hover:bg-[#A07D1A] hover:-translate-y-px active:translate-y-0",
        destructive:
          "bg-[#EF4444] text-white shadow-sm hover:bg-[#DC2626]",
        outline:
          "border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]",
        secondary:
          "bg-[#F1F5F9] text-[#1B3A6B] hover:bg-[#E2E8F0]",
        ghost: "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
        link: "text-[#1B3A6B] underline-offset-4 hover:underline hover:text-[#C49A2A]",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
