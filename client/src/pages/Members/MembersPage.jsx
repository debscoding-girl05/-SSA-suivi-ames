import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { listMembers, deleteMember } from '../../api/members';
import { listDepartments } from '../../api/departments';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import MemberStatusBadge from '../../components/MemberStatusBadge';
import MemberForm from './MemberForm';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'actif', label: 'Actif' },
  { value: 'inactif', label: 'Inactif' },
];

export default function MembersPage() {
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'leader';
  const canDelete = user?.role === 'admin';

  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listMembers({
        search,
        status: statusFilter,
        departmentId: departmentFilter,
        limit: 100,
      });
      setMembers(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err?.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, departmentFilter]);

  // Debounce reloads as filters change.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    listDepartments()
      .then((res) => setDepartments(res.data))
      .catch(() => setDepartments([]));
  }, []);

  const departmentOptions = useMemo(
    () => [
      { value: '', label: 'Tous les départements' },
      ...departments.map((d) => ({ value: String(d.id), label: d.name })),
    ],
    [departments]
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(member) {
    setEditing(member);
    setModalOpen(true);
  }
  function handleSaved() {
    setModalOpen(false);
    setEditing(null);
    load();
  }
  async function handleDelete(member) {
    if (!window.confirm(`Supprimer ${member.firstName} ${member.lastName} ?`)) return;
    try {
      await deleteMember(member.id);
      load();
    } catch (err) {
      setError(err?.message || 'Suppression impossible.');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Membres</h2>
          <p className="text-sm text-muted-foreground">
            {total} membre{total > 1 ? 's' : ''} suivi{total > 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="lg">
            <Plus className="size-4" /> Ajouter un membre
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un membre…"
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          className="sm:w-44"
        />
        <Select
          value={departmentFilter}
          onChange={setDepartmentFilter}
          options={departmentOptions}
          searchable
          className="sm:w-52"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-6" />
          </div>
          <p className="font-medium">Aucun membre trouvé</p>
          <p className="text-sm text-muted-foreground">Ajustez vos filtres ou ajoutez un nouveau membre.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="flex flex-col gap-2 sm:hidden">
            {members.map((m) => (
              <li key={m.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{m.firstName} {m.lastName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {m.departmentName || 'Sans département'}
                    </p>
                    {m.phone && <p className="text-sm text-muted-foreground">{m.phone}</p>}
                  </div>
                  <MemberStatusBadge status={m.status} />
                </div>
                {(canWrite || canDelete) && (
                  <div className="mt-3 flex justify-end gap-1">
                    {canWrite && (
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)} aria-label="Modifier">
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(m)} aria-label="Supprimer">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nom</th>
                  <th className="px-4 py-2.5 font-medium">Département</th>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">Statut</th>
                  {(canWrite || canDelete) && <th className="px-4 py-2.5 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{m.firstName} {m.lastName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.departmentName || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {m.phone || m.email || '—'}
                    </td>
                    <td className="px-4 py-2.5"><MemberStatusBadge status={m.status} /></td>
                    {(canWrite || canDelete) && (
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)} aria-label="Modifier">
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(m)} aria-label="Supprimer">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le membre' : 'Ajouter un membre'}
      >
        <MemberForm
          member={editing}
          departments={departments}
          onSaved={handleSaved}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
