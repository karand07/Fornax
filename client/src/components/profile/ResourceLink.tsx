import { ExternalLink, FileText, Video, Dumbbell, BookOpen } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { RecommendationResource } from '../../api/hooks';

export interface ResourceLinkProps {
  resource: RecommendationResource;
  className?: string;
}

export function ResourceLink({ resource, className = '' }: ResourceLinkProps) {
  const getIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'VIDEO') return Video;
    if (t === 'EXERCISE') return Dumbbell;
    if (t === 'ARTICLE' || t === 'DOCUMENT') return FileText;
    return BookOpen;
  };

  const Icon = getIcon(resource.type);

  const getDifficultyBadge = (diff: 1 | 2 | 3) => {
    switch (diff) {
      case 1:
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          >
            Easy
          </Badge>
        );
      case 2:
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-semibold tracking-wider text-amber-400 border-amber-500/30 bg-amber-500/10"
          >
            Medium
          </Badge>
        );
      case 3:
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-semibold tracking-wider text-rose-400 border-rose-500/30 bg-rose-500/10"
          >
            Hard
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card/60 hover:bg-accent/40 hover:border-primary/40 transition-colors ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:text-primary transition-colors">
          <Icon className="w-4 h-4 shrink-0" />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block">
            {resource.title}
          </span>
          <span className="text-[11px] text-muted-foreground capitalize">
            {resource.type.toLowerCase()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {getDifficultyBadge(resource.difficulty)}
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </a>
  );
}
