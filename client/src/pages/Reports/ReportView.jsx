import { Button } from '@/components/ui/button';
import { Download, Send, Pencil, Trash2 } from 'lucide-react';
import { printReport } from '@/lib/printReport';

// Read a report + export PDF; author actions when still a draft.
export default function ReportView({ report, canEdit, onEdit, onTransmit, onDelete }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted-foreground">
          {report.departmentName ? `${report.departmentName} · ` : ''}Semaine {report.week}/{report.year}
          {report.authorName ? ` · ${report.authorName}` : ''}
          {' · '}
          <span className={report.status === 'transmis' ? 'font-medium text-success-foreground-light' : 'font-medium text-muted-foreground'}>
            {report.status === 'transmis' ? 'Transmis' : 'Brouillon'}
          </span>
        </p>
      </div>

      <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed">
        {report.content?.trim() || <span className="italic text-muted-foreground">(Aucun contenu)</span>}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => printReport(report)}>
          <Download className="size-4" /> Télécharger en PDF
        </Button>
        {canEdit && (
          <>
            <Button type="button" variant="ghost" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive-dark" /> Supprimer
            </Button>
            <Button type="button" variant="secondary" onClick={onEdit}>
              <Pencil className="size-4" /> Éditer
            </Button>
            <Button type="button" onClick={onTransmit}>
              <Send className="size-4" /> Transmettre
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
