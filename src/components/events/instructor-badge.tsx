"use client"

import { Badge } from "@/components/ui/badge"
import { GraduationCap, Gamepad2 } from "lucide-react"
import { Personnel, getPersonnelDisplayName } from "./personnel-utils"

interface InstructorBadgeProps {
  instructor: {
    user?: Personnel | null;
    role?: string;
  };
  eventType?: 'training' | 'operation';
  size?: 'sm' | 'md';
}

export function InstructorBadge({ instructor, eventType, size = 'sm' }: InstructorBadgeProps) {
  const displayName = getPersonnelDisplayName(instructor.user);
  const isTraining = eventType === 'training' || instructor.user?.callSign?.toLowerCase().includes('train');
  
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  
  return (
    <Badge variant="secondary" className={`${textSize} flex items-center gap-1`}>
      {isTraining ? (
        <GraduationCap className={iconSize} />
      ) : (
        <Gamepad2 className={iconSize} />
      )}
      <span className="truncate max-w-[100px]">{displayName}</span>
      {instructor.role && (
        <span className="text-muted-foreground ml-1">
          ({instructor.role.replace('_', ' ')})
        </span>
      )}
    </Badge>
  );
}
