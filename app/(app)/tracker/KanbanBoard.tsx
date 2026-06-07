"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, type AppStatus, statusLabel, statusColor } from "./constants";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

type Application = {
  id: string;
  status: string | null;
  notes: string | null;
  applied_at: string | null;
  job_listing_id: string;
  job_listings: {
    title: string;
    company: string;
    source_url: string;
  } | null;
};

function KanbanCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-[#0A0F1E] border border-[#1a2340] rounded-lg p-3.5 cursor-grab active:cursor-grabbing"
    >
      <p className="text-sm font-medium text-white leading-tight">
        {app.job_listings?.title ?? "Unknown role"}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{app.job_listings?.company}</p>
      {app.job_listings?.source_url && (
        <a
          href={app.job_listings.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> View listing
        </a>
      )}
    </div>
  );
}

export default function KanbanBoard({ applications: initial }: { applications: Application[] }) {
  const supabase = createClient();
  const [apps, setApps] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function getByStatus(status: AppStatus) {
    return apps.filter((a) => a.status === status);
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const newStatus = String(over.id) as AppStatus;
    if (!STATUSES.includes(newStatus as AppStatus)) return;

    const app = apps.find((a) => a.id === active.id);
    if (!app || app.status === newStatus) return;

    setApps((prev) =>
      prev.map((a) =>
        a.id === active.id ? { ...a, status: newStatus } : a
      )
    );

    supabase
      .from("applications")
      .update({ status: newStatus, status_updated_at: new Date().toISOString() })
      .eq("id", String(active.id))
      .then(({ error }) => {
        if (error) console.error("Failed to update status:", error);
      });
  }

  const activeApp = apps.find((a) => a.id === activeId);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const col = getByStatus(status);
          return (
            <div
              key={status}
              className={cn(
                "flex-shrink-0 w-56 bg-[#0F1629] border rounded-xl overflow-hidden",
                statusColor[status]
              )}
            >
              <div className="px-4 py-3 border-b border-[#1a2340] flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {statusLabel[status]}
                </span>
                <span className="text-xs text-slate-500">{col.length}</span>
              </div>
              <SortableContext
                id={status}
                items={col.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="p-3 space-y-2 min-h-[200px]">
                  {col.map((app) => (
                    <KanbanCard key={app.id} app={app} />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeApp && (
          <div className="bg-[#0A0F1E] border border-[#1B5E20] rounded-lg p-3.5 shadow-2xl rotate-2">
            <p className="text-sm font-medium text-white">
              {activeApp.job_listings?.title}
            </p>
            <p className="text-xs text-slate-400">{activeApp.job_listings?.company}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
