import { memo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Eye, Trash2, MoreVertical, CheckCircle2 } from 'lucide-react';

// Define a interface da coluna para a tabela de dados
interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  render?: (value: any, item: T) => ReactNode;
  className?: string;
}

// Define as propriedades do componente DataTable
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onView?: (item: T) => void;
  onDelete?: (item: T) => void;
  onToggleAtivo?: (item: T) => void;
  onMarkAsPaid?: (item: T) => void;
  canEdit?: (item: T) => boolean;
  canView?: (item: T) => boolean;
  canDelete?: (item: T) => boolean;
  canToggleAtivo?: (item: T) => boolean;
  canMarkAsPaid?: (item: T) => boolean;
  emptyMessage?: string;
}

// Função auxiliar para obter o valor de uma célula
const getCellValue = <T,>(item: T, column: Column<T>): ReactNode => {
  if (column.render) {
    return column.render(item[column.accessor as keyof T], item);
  }
  if (typeof column.accessor === 'function') {
    return column.accessor(item);
  }
  return String(item[column.accessor as keyof T]);
};

// Componente DataTable genérico e responsivo
function DataTableComponent<T extends { id?: string | number; ativo?: boolean }>({
  data,
  columns,
  onEdit,
  onView,
  onDelete,
  onToggleAtivo,
  onMarkAsPaid,
  canEdit,
  canView,
  canDelete,
  canToggleAtivo,
  canMarkAsPaid,
  emptyMessage = 'Nenhum registro encontrado',
}: DataTableProps<T>) {
  const hasRowActions = Boolean(onEdit || onView || onDelete || onToggleAtivo || onMarkAsPaid);

  // Se não houver dados, exibe uma mensagem centralizada
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      {/* Visualização em Tabela para telas maiores (sm e acima) */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto hidden sm:block">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {hasRowActions && (
                <TableHead className="text-right min-w-[100px]">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, itemIndex) => (
              <TableRow key={item.id ?? itemIndex}>
                {columns.map((column, index) => (
                  <TableCell key={index} className={column.className}>
                    {getCellValue(item, column)}
                  </TableCell>
                ))}
                {hasRowActions && (
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {onMarkAsPaid && canMarkAsPaid?.(item) !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-3 hover:bg-emerald-600 hover:text-white transition-colors text-emerald-600"
                          onClick={() => onMarkAsPaid(item)}
                          title="Marcar como pago"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      {onToggleAtivo && canToggleAtivo?.(item) !== false && (
                        <Switch
                          checked={Boolean((item as any).ativo)}
                          onCheckedChange={() => onToggleAtivo(item)}
                          aria-label="Ativar/desativar"
                        />
                      )}
                      {onView && canView?.(item) !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-3 hover:bg-primary hover:text-white transition-colors"
                          onClick={() => onView(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onEdit && canEdit?.(item) !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-3 hover:bg-primary hover:text-white transition-colors"
                          onClick={() => onEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && canDelete?.(item) !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-3 hover:bg-destructive hover:text-white transition-colors"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Visualização em Cartões para telas pequenas */}
      <div className="sm:hidden space-y-4">
        {data.map((item, itemIndex) => (
          <div key={item.id ?? itemIndex} className="bg-card border border-border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-2">
                {columns.map((column, index) => {
                  const cellValue = getCellValue(item, column);
                  // Verifica se é a coluna de status para renderizar o switch
                  if (column.header === 'Status' && onToggleAtivo) {
                    const hasAtivo = 'ativo' in item;
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">{column.header}</p>
                          <div className="text-base">{cellValue}</div>
                        </div>
                        {hasAtivo && canToggleAtivo?.(item) !== false && (
                          <Switch
                            checked={(item as any).ativo}
                            onCheckedChange={() => onToggleAtivo(item)}
                            aria-label="Ativar/desativar"
                          />
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={index}>
                      <p className="text-sm font-semibold text-muted-foreground">{column.header}</p>
                      <div className="text-base">{cellValue}</div>
                    </div>
                  );
                })}
              </div>

              {/* Menu de Ações para mobile */}
              {(onEdit || onView || onDelete || onToggleAtivo || onMarkAsPaid) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2 h-auto">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onMarkAsPaid && canMarkAsPaid?.(item) !== false && (
                      <DropdownMenuItem
                        onClick={() => onMarkAsPaid(item)}
                        className="flex items-center gap-2 cursor-pointer text-emerald-600"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar como pago</span>
                      </DropdownMenuItem>
                    )}
                    {onToggleAtivo && canToggleAtivo?.(item) !== false && (
                      <DropdownMenuItem
                        onClick={() => onToggleAtivo(item)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Switch checked={Boolean((item as any).ativo)} />
                        <span>Status</span>
                      </DropdownMenuItem>
                    )}
                    {onView && canView?.(item) !== false && (
                      <DropdownMenuItem
                        onClick={() => onView(item)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Visualizar</span>
                      </DropdownMenuItem>
                    )}
                    {onEdit && canEdit?.(item) !== false && (
                      <DropdownMenuItem
                        onClick={() => onEdit(item)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Editar</span>
                      </DropdownMenuItem>
                    )}
                    {onDelete && canDelete?.(item) !== false && (
                      <DropdownMenuItem
                        onClick={() => onDelete(item)}
                        className="flex items-center gap-2 text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
