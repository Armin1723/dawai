import type { ComponentType } from "react";
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  capabilities: string[];
  phase: string;
}

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  capabilities,
  phase,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <Construction className="size-3" /> Phase {phase} · In progress
          </Badge>
        }
      />
      <EmptyState
        icon={Icon}
        title={`${title} is being built`}
        description={`This module ships as part of Phase ${phase}. Here's what's planned: it will support the full workflow from the PRD.`}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {capabilities.map((cap) => (
              <Badge key={cap} variant="outline">
                {cap}
              </Badge>
            ))}
          </div>
        }
      />
      <div className="flex justify-center">
        <Button variant="outline" disabled>
          Coming soon
        </Button>
      </div>
    </div>
  );
}
