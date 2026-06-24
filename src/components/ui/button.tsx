import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Landing primary CTA — gold with deep gold shadow + lift on hover
        default:
          "bg-[#C8963E] text-white shadow-[0_14px_40px_-12px_rgba(200,150,62,0.7)] hover:bg-[#b58432] hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-12px_rgba(200,150,62,0.85)] active:translate-y-0",
        // Navy variant — landing secondary CTA
        navy:
          "bg-[#1E3A5F] text-white shadow-[0_10px_30px_-12px_rgba(30,58,95,0.5)] hover:bg-[#152a47] hover:-translate-y-0.5 active:translate-y-0",
        gold:
          "bg-[#C8963E] text-white shadow-[0_14px_40px_-12px_rgba(200,150,62,0.7)] hover:bg-[#b58432] hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-12px_rgba(200,150,62,0.85)] active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:-translate-y-0.5",
        outline:
          "border border-[rgba(30,58,95,0.15)] bg-white/60 text-[#1E3A5F] backdrop-blur-sm shadow-sm hover:bg-white hover:border-[#C8963E]/40 hover:-translate-y-0.5",
        secondary:
          "bg-[#eef2f9] text-[#1E3A5F] shadow-sm hover:bg-[#e2e8f3] hover:-translate-y-0.5",
        ghost: "text-[#1E3A5F] hover:bg-[#1E3A5F]/5",
        link: "text-[#1E3A5F] underline-offset-4 hover:underline hover:text-[#C8963E]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-7 text-base",
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
