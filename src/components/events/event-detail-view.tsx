"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Clock, Server, GraduationCap, Gamepad2, Edit, Trash2 } from "lucide-react"
import { Personnel, getPersonnelDisplayName } from "./personnel-utils"
import { EventType } from "./event-card"

interface EventDetailViewProps {
  event: EventType;
  onEdit?: (event: EventType) => void;
  onClear?: (bookingCode: string) => void;
  onClearEvent?: (bookingCode: string) => Promise<void>;
}

export function EventDetailView({ event, onEdit, onClear, onClearEvent }: EventDetailViewProps) {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Australia/Sydney'
    });
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      timeZone: 'Australia/Sydney'
    });
  };

  const handleClearEvent = async () => {
    if (onClearEvent) {
      try {
        await onClearEvent(event.bookingCode);
      } catch (error) {
        console.error("Failed to clear event:", error);
        alert("Failed to clear event. Please check the booking code.");
      }
    } else if (onClear) {
      onClear(event.bookingCode);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Event</Label>
          <p className="text-sm font-medium">{event.title}</p>
        </div>
        <div>
          <Label>Booking Code</Label>
          <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{event.bookingCode}</p>
        </div>
        <div>
          <Label>Date & Time</Label>
          <p className="text-sm">
            {formatDate(event.startDate)} • {formatTime(event.startDate)} - {formatTime(event.endDate)}
          </p>
        </div>
        <div>
          <Label>Category</Label>
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            {event.title?.toLowerCase().includes('training') ? (
              <>
                <GraduationCap className="w-3 h-3" />
                Training
              </>
            ) : (
              <>
                <Gamepad2 className="w-3 h-3" />
                Operation
              </>
            )}
          </Badge>
        </div>
        <div>
          <Label>Server</Label>
          <p className="text-sm">{event.server?.name || 'No server assigned'}</p>
        </div>
        <div>
          <Label>
            {event.title?.toLowerCase().includes('training') ? 'Instructors' : 'Game Masters'}
          </Label>
          <div className="space-y-1">
            {event.instructors?.length > 0 ? (
              event.instructors.map((inst, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <GraduationCap className="w-3 h-3" />
                  <span className="text-sm">{getPersonnelDisplayName(inst.user)}</span>
                  {inst.role && (
                    <Badge variant="outline" className="text-xs">
                      {inst.role.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No instructors assigned</p>
            )}
          </div>
        </div>
      </div>
      
      {event.description && (
        <div>
          <Label>Description</Label>
          <p className="text-sm text-muted-foreground">{event.description}</p>
        </div>
      )}

      {(onEdit || onClear || onClearEvent) && (
        <div className="flex gap-2 pt-4">
          {onEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(event)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Event
            </Button>
          )}
          {(onClear || onClearEvent) && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleClearEvent}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
