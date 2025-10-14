"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EventCard, EventType } from "./event-card"

interface EventListProps {
  events: EventType[];
  onEventClick: (event: EventType) => void;
  emptyMessage?: string;
  groupOverlapping?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EventList({ 
  events, 
  onEventClick, 
  emptyMessage = "No events scheduled",
  groupOverlapping = true,
  size = 'md'
}: EventListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Check if events overlap
  const hasOverlap = (event1: EventType, event2: EventType) => {
    return event1.startDate < event2.endDate && event2.startDate < event1.endDate;
  };

  // Group overlapping events
  const getEventGroups = (dayEvents: EventType[]) => {
    if (!groupOverlapping) {
      return dayEvents.map(event => [event]);
    }

    const groups: EventType[][] = [];
    const processed = new Set<string>();

    dayEvents.forEach(event => {
      if (processed.has(event._id)) return;

      const group = [event];
      processed.add(event._id);

      dayEvents.forEach(otherEvent => {
        if (otherEvent._id === event._id || processed.has(otherEvent._id)) return;
        if (hasOverlap(event, otherEvent)) {
          group.push(otherEvent);
          processed.add(otherEvent._id);
        }
      });

      groups.push(group);
    });

    return groups;
  };

  const eventGroups = getEventGroups(events);

  const toggleGroupExpansion = (groupIndex: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupIndex.toString())) {
      newExpanded.delete(groupIndex.toString());
    } else {
      newExpanded.add(groupIndex.toString());
    }
    setExpandedGroups(newExpanded);
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-6 sm:py-10 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {eventGroups.map((group, groupIndex) => {
        const primaryEvent = group[0];
        const hasMultiple = group.length > 1;
        const isExpanded = expandedGroups.has(groupIndex.toString());

        return (
          <div key={groupIndex} className="space-y-2 sm:space-y-3">
            {/* Primary Event Card */}
            <EventCard 
              event={primaryEvent}
              onClick={() => onEventClick(primaryEvent)}
              size={size}
            />
            
            {/* Show additional overlapping events */}
            {hasMultiple && !isExpanded && (
              <Button
                variant="outline"
                size="sm"
                className={`w-full ${size === 'sm' ? 'h-6 text-xs' : size === 'md' ? 'h-8 sm:h-9 text-sm' : 'h-9 text-sm'}`}
                onClick={() => toggleGroupExpansion(groupIndex)}
              >
                +{group.length - 1} more event{group.length - 1 > 1 ? 's' : ''}
              </Button>
            )}
            
            {hasMultiple && isExpanded && (
              <>
                {group.slice(1).map(event => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onClick={() => onEventClick(event)}
                    size={size}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full ${size === 'sm' ? 'h-6 text-xs' : 'h-8 text-xs'}`}
                  onClick={() => toggleGroupExpansion(groupIndex)}
                >
                  Show less
                </Button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
