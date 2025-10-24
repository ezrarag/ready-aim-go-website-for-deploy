"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  Video,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  location?: string;
  creator: {
    email: string;
    displayName?: string;
  };
  meetingLink?: string;
  client?: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      // Fetch calendar data from Pulse API
      const calendarResponse = await fetch('/api/pulse/calendar');
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        
        // Transform calendar events
        const calendarEvents: CalendarEvent[] = calendarData.events?.map((event: any) => ({
          id: event.data.eventId,
          summary: event.data.summary,
          description: event.data.description,
          start: event.data.start,
          end: event.data.end,
          attendees: event.data.attendees || [],
          location: event.data.location,
          creator: event.data.creator,
          meetingLink: event.data.meetingLink,
          client: event.project || 'General'
        })) || [];

        setEvents(calendarEvents);
      }

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => {
        const startTime = new Date(event.start.dateTime || event.start.date || '');
        return startTime >= now;
      })
      .sort((a, b) => {
        const aTime = new Date(a.start.dateTime || a.start.date || '');
        const bTime = new Date(b.start.dateTime || b.start.date || '');
        return aTime.getTime() - bTime.getTime();
      })
      .slice(0, 5);
  };

  const getTodaysEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return events.filter(event => {
      const startTime = new Date(event.start.dateTime || event.start.date || '');
      return startTime >= today && startTime < tomorrow;
    });
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      return new Date(event.start.dateTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    return 'All day';
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'tentative': return 'bg-yellow-100 text-yellow-800';
      case 'needsAction': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const upcomingEvents = getUpcomingEvents();
  const todaysEvents = getTodaysEvents();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar & Schedule</h1>
            <p className="text-gray-600">Manage meetings, deadlines, and client appointments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* Today's Overview */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{todaysEvents.length}</div>
                <div className="text-sm text-blue-700">Events Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {upcomingEvents.filter(e => {
                    const start = new Date(e.start.dateTime || e.start.date || '');
                    const now = new Date();
                    const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
                    return diffHours <= 24 && diffHours > 0;
                  }).length}
                </div>
                <div className="text-sm text-blue-700">Next 24 Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {upcomingEvents.length}
                </div>
                <div className="text-sm text-blue-700">Upcoming Events</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysEvents.length > 0 ? (
                  todaysEvents.map((event) => (
                    <div key={event.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{event.summary}</h4>
                            {event.client && (
                              <Badge variant="outline" className="text-xs">
                                {event.client}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {formatEventTime(event)}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-500 mb-2">{event.description}</p>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                        {event.meetingLink && (
                          <Button variant="outline" size="sm">
                            <Video className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No events scheduled for today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{event.summary}</h4>
                            {event.client && (
                              <Badge variant="outline" className="text-xs">
                                {event.client}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {new Date(event.start.dateTime || event.start.date || '').toLocaleDateString()} at {formatEventTime(event)}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-500 mb-2">{event.description}</p>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Users className="h-3 w-3" />
                              {event.attendees.length} attendees
                            </div>
                          )}
                        </div>
                        {event.meetingLink && (
                          <Button variant="outline" size="sm">
                            <Video className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming events</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meeting Preparation */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Preparation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Client Meeting Tomorrow</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Serenity Wellness - Quarterly Review
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Prepare: Revenue report, deployment status, upcoming features
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">BEAM Development Sync</h4>
                    <p className="text-sm text-green-800 mt-1">
                      Weekly team standup - All systems operational
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Agenda: Sprint review, next week planning, blockers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
