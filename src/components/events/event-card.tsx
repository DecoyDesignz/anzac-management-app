"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, Users, Server, GraduationCap } from "lucide-react"
import { Personnel, getPersonnelDisplayName } from "./personnel-utils"

export interface EventType {
  _id: string;
  title: string;
  startDate: number;
  endDate: number;
  status: string;
  server?: { name: string } | null;
  instructors: Array<{ user?: Personnel | null; role?: string }>;
  eventTypeColor?: string;
  eventType?: { color: string } | null;
  bookingCode: string;
  maxParticipants?: number;
  currentParticipants?: number;
  description?: string;
}

interface EventCardProps {
  event: EventType;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function EventCard({ event, onClick, size = 'md' }: EventCardProps) {
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
  const durationHours = durationMinutes / 60;
  
  // Calculate timeline position (0-24 hours scale)
  const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
  const startPercent = (startHour / 24) * 100;
  const durationPercent = (durationHours / 24) * 100;
  
  // Determine event type color
  const isTraining = event.title?.toLowerCase().includes('training');
  const eventColor = isTraining ? 'bg-primary' : 'bg-blue-600';
  const borderColor = isTraining ? 'border-primary' : 'border-blue-600';
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Australia/Sydney'
    });
  };

  // Size-based styling
  const cardPadding = size === 'sm' ? 'p-2' : size === 'md' ? 'p-3 sm:p-4' : 'p-4 sm:p-5';
  const spaceY = size === 'sm' ? 'space-y-1' : size === 'md' ? 'space-y-2 sm:space-y-3' : 'space-y-3 sm:space-y-4';
  const titleSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm sm:text-base' : 'text-base sm:text-lg';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-sm sm:text-base';
  
  return (
    <div 
      className={`${cardPadding} rounded-lg border-2 ${borderColor} glass cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${spaceY}`}
      onClick={onClick}
    >
      {/* Title and Booking Code */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <h4 className={`font-semibold ${titleSize} leading-tight flex-1`}>
          {event.title || 'Untitled Event'}
        </h4>
        {event.bookingCode && size !== 'sm' && (
          <Badge variant="secondary" className={`font-mono ${textSize} hidden sm:inline-flex`}>
            {event.bookingCode}
          </Badge>
        )}
      </div>
      
      {/* Timeline Bar - Hidden on mobile and small size to save space */}
      {size !== 'sm' && (
        <div className="hidden sm:block relative h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute h-full ${eventColor} rounded-full transition-all`}
            style={{
              left: `${startPercent}%`,
              width: `${durationPercent}%`
            }}
          />
          {/* Hour markers */}
          <div className="absolute inset-0 flex">
            {[0, 6, 12, 18, 24].map((hour) => (
              <div 
                key={hour}
                className="absolute h-full w-px bg-border/30"
                style={{ left: `${(hour / 24) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Time Display */}
      <div className={`flex items-center gap-1.5 ${textSize} text-muted-foreground`}>
        <Clock className="w-4 h-4" />
        <span className="truncate">{formatTime(event.startDate)} - {formatTime(event.endDate)}</span>
        {size !== 'sm' && (
          <span className="text-muted-foreground/70 hidden sm:inline">
            ({durationHours.toFixed(1)}h)
          </span>
        )}
      </div>
      
      {/* Server */}
      {event.server && (
        <div className={`flex items-center gap-1.5 ${textSize} text-muted-foreground`}>
          <Server className="w-4 h-4" />
          <span className="truncate">{event.server.name}</span>
        </div>
      )}
      
      {/* Instructors */}
      {event.instructors && event.instructors.length > 0 && (
        <div className={`flex items-center gap-1.5 ${textSize} text-muted-foreground`}>
          <GraduationCap className="w-4 h-4" />
          <span className="truncate">
            {event.instructors.map((inst) => getPersonnelDisplayName(inst.user)).join(', ')}
          </span>
        </div>
      )}
      
      {/* Participants */}
      {event.maxParticipants && size !== 'sm' && (
        <div className={`flex items-center gap-1.5 ${textSize} text-muted-foreground`}>
          <Users className="w-4 h-4" />
          <span>
            {event.currentParticipants || 0}/{event.maxParticipants}
          </span>
        </div>
      )}
    </div>
  );
}
