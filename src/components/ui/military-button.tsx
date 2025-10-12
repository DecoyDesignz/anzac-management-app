"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MilitaryButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: "primary" | "secondary" | "blue" | "cyan";
}

export function MilitaryButton({ 
  className, 
  variant = "primary", 
  children, 
  ...props 
}: MilitaryButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "blue":
        return "bg-military-blue hover:bg-military-blue/90 text-military-blue-foreground border-military-blue/20 hover:border-military-blue/40";
      case "cyan":
        return "bg-military-cyan hover:bg-military-cyan/90 text-military-cyan-foreground border-military-cyan/20 hover:border-military-cyan/40";
      case "secondary":
        return "bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border hover:border-military-blue/30";
      default:
        return ""; // Use default primary styling
    }
  };

  return (
    <Button
      className={cn(
        "transition-smooth",
        getVariantClasses(),
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
