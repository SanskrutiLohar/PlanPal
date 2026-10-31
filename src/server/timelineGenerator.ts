import { EventFormData, TimelineTask } from '../types/plan.js';

function computeDateBefore(eventDateStr: string, daysBefore: number, todayStr: string): string {
  if (!eventDateStr) return '';
  const d = new Date(eventDateStr + 'T00:00:00');
  d.setDate(d.getDate() - daysBefore);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const calculated = `${year}-${month}-${day}`;
  // Clamp past dates to today
  return calculated < todayStr ? todayStr : calculated;
}

export function generateIntelligentTimeline(formData: EventFormData): TimelineTask[] {
  const typeLower = (formData.eventType || '').toLowerCase();
  const guests = formData.guestCount || 100;
  const eventDate = formData.date || '';
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const tasks: TimelineTask[] = [];
  let idCounter = 1;

  const addTask = (
    when: string,
    daysBefore: number,
    task: string,
    description: string,
    category: TimelineTask['category'],
    priority: TimelineTask['priority']
  ) => {
    const dueDate = eventDate ? computeDateBefore(eventDate, daysBefore, todayIST) : undefined;
    tasks.push({
      id: 'task_' + idCounter++,
      when,
      dueDate,
      task,
      description,
      category,
      priority,
      completed: false,
    });
  };

  if (typeLower.includes('birthday')) {
    addTask('6 weeks before', 42, 'Finalise party theme and shortlist venues', 'Choose indoor play zone, club banquet or terrace venue.', 'Venue', 'High');
    addTask('4 weeks before', 28, 'Confirm caterer and custom birthday cake order', 'Select kid-friendly finger foods and specify cake flavour and weight.', 'Catering', 'High');
    addTask('3 weeks before', 21, 'Send digital party invitations and track RSVPs', 'Collect headcount and any dietary requirements.', 'Logistics', 'Medium');
    addTask('2 weeks before', 14, 'Book children party host and return gifts', 'Order educational toys or plant saplings as return favours.', 'General', 'Medium');
    addTask('1 week before', 7, 'Reconfirm venue setup timing and music playlist', 'Check microphone sound and balloon backdrop specifications.', 'Decor', 'Normal');
    addTask('2 days before', 2, 'Pick up return gifts and verify cake delivery window', 'Ensure cake box will be chilled and return gifts are packed with tags.', 'Logistics', 'High');
    addTask('Event day morning', 0, 'Inspect balloon and stage decor before guests arrive', 'Check party games area, table seating and water dispensers.', 'Venue', 'High');
  } else if (typeLower.includes('community')) {
    addTask('8 weeks before', 56, 'Form volunteer committee and reserve civic hall', 'Elect core heads for logistics, stage, food and finance.', 'Venue', 'High');
    addTask('6 weeks before', 42, 'Apply for local municipal and sound permissions', 'Check sound curfew times and public address licensing requirements.', 'Logistics', 'High');
    addTask('4 weeks before', 28, 'Engage community caterer and finalise menu', 'Plan hygienic buffet lines and safe drinking water supply.', 'Catering', 'High');
    addTask('3 weeks before', 21, 'Publish event announcements and print badges', 'Distribute schedules across neighbourhood notices and community groups.', 'General', 'Medium');
    addTask('2 weeks before', 14, 'Finalise audio-visual equipment and power backup', 'Verify generator diesel supply and stage microphone counts.', 'Logistics', 'High');
    addTask('1 week before', 7, 'Conduct volunteer briefing and waste management dry run', 'Assign volunteers to registration desk, parking and clean-up.', 'Logistics', 'Medium');
    addTask('Event day 07:00', 0, 'Open registration counter and inspect sound system', 'Set up welcome desk, hydration points and schedule boards.', 'General', 'High');
  } else {
    // Default to Wedding
    addTask('6 months before', 180, 'Lock wedding muhurat and reserve ceremony venue', 'Secure banquet hall or lawn with initial advance token.', 'Venue', 'High');
    addTask('4 months before', 120, 'Shortlist traditional caterer and arrange food tasting', 'Taste feast menu dishes and confirm live food stations.', 'Catering', 'High');
    addTask('3 months before', 90, 'Book mandap decorator, floral specialist and photographer', 'Lock entrance floral arch, stage lighting and video delivery terms.', 'Decor', 'High');
    addTask('2 months before', 60, 'Order invitations and schedule attire trials', 'Complete blouse, sherwani and saree alteration checks.', 'Attire', 'Medium');
    addTask('6 weeks before', 42, 'Ask the local registrar how far ahead to file marriage notice', 'Verify affidavit requirements and required witnesses documentation.', 'Logistics', 'High');
    addTask('3 weeks before', 21, 'Finalise pooja priest ritual list and samagri items', 'Review holy havan requirements, puja timings and elder seating.', 'Rituals', 'Medium');
    addTask('10 days before', 10, 'Review guest transit, room allotments and welcome gifts', 'Confirm airport/station pick-ups and room key distribution desk.', 'Logistics', 'Medium');
    addTask('3 days before', 3, 'Coordinate sangeet/haldi rehearsals and sound checks', 'Test lapel microphones, cordless mics and backup power.', 'General', 'Normal');
    addTask('1 day before', 1, 'Inspect mandap construction and floral freshness', 'Verify seating layout, stage spotlights and dining tables.', 'Decor', 'High');
    addTask('Wedding day morning', 0, 'Mandap pooja inspection and milni welcome assembly', 'Receive baraat, monitor dining buffet and disburse vendor milestone payments.', 'Rituals', 'High');
  }

  // Large guest count specific reminders
  if (guests > 250) {
    addTask('2 weeks before', 14, 'Arrange dedicated parking marshals and excess queue control', 'Coordinate with venue security for valet flow and extra restrooms.', 'Logistics', 'Medium');
  }

  return tasks;
}
