"use client";

interface ActivityFeedProps {
  events: string[];
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="mt-8 bg-white/5 p-4 rounded-lg text-white">
      <h3 className="mb-2 font-semibold">Activity Feed</h3>
      <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
        {events.length === 0 ? (
          <p className="text-white/60">No activity yet</p>
        ) : (
          events.map((ev, i) => <p key={i} className="truncate">{ev}</p>)
        )}
      </div>
    </div>
  );
}
