import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function IconLabel({
  icon: Icon,
  children,
  className,
  iconClassName,
  ...props
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)} {...props}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName)} />
      <span className="truncate">{children}</span>
    </span>
  );
}
