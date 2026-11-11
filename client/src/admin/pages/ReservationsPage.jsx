import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { normalizeList, patchInList } from '../lib/data.js';
import {
  RESERVATION_ACTION_LABELS,
  RESERVATION_ACTIONS,
  RESERVATION_STATUSES,
  STATUS_META,
  statusLabel,
} from '../lib/constants.js';
import {
  formatCalendarDate,
  formatDateTime,
  friendlyDay,
  mailtoHref,
  pluralise,
  telHref,
  todayLondon,
} from '../lib/format.js';
import { useApiQuery, useDebouncedValue } from '../lib/hooks.js';
import { useStats } from '../lib/stats.jsx';
import { Card, DetailList, PageHeader } from '../components/Card.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Drawer } from '../components/Dialog.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { SearchInput, Toolbar } from '../components/Filters.jsx';
import { SelectInput, TextArea } from '../components/FormControls.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { DemoBadge, StatusBadge } from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { BTN_DANGER, CHIP_LIGHT, LINK } from '../components/ui.js';
import { cx } from '../lib/cx.js';

const PAGE_SIZE = 20;
const DESTRUCTIVE = new Set(['cancelled', 'no-show']);

export default function ReservationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { reload: reloadStats } = useStats();
  const [params] = useSearchParams();
  const dateInputId = useId();

  const [view, setView] = useState(() => (params.get('view') === 'upcoming' ? 'upcoming' : 'date'));
  const [date, setDate] = useState(() => {
    const d = params.get('date');
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayLondon();
  });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(null);

  const today = todayLondon();
  const query =
    view === 'upcoming'
      ? { from: today, status, search: debouncedSearch, page, limit: PAGE_SIZE }
      : { date, status, search: debouncedSearch, page, limit: PAGE_SIZE };
  const q = useApiQuery('/admin/reservations', { query });
  const list = normalizeList(q.data);
  const current = selected ? list.data.find((r) => r._id === selected._id) ?? selected : null;

  function resetPage(fn) {
    return (...args) => {
      fn(...args);
      setPage(1);
    };
  }

  async function updateReservation(reservation, patch, successMessage) {
    const updated = await api.patch(`/admin/reservations/${reservation._id}`, patch);
    const merged = { ...reservation, ...(updated ?? patch) };
    q.setData((d) => patchInList(d, reservation._id, merged));
    setSelected((s) => (s && s._id === reservation._id ? merged : s));
    toast.success(successMessage);
    q.reload();
    reloadStats();
    return merged;
  }

  async function changeStatus(reservation, nextStatus) {
    if (DESTRUCTIVE.has(nextStatus)) {
      const ok = await confirm({
        title: nextStatus === 'cancelled' ? `Cancel ${reservation.name}’s booking?` : `Mark ${reservation.name} as a no-show?`,
        message: `${pluralise(reservation.guests ?? 0, 'guest')} on ${formatCalendarDate(reservation.date)} at ${reservation.time}. You can change the status again from the booking details if needed.`,
        confirmLabel: nextStatus === 'cancelled' ? 'Cancel booking' : 'Mark no-show',
        cancelLabel: 'Go back',
      });
      if (!ok) return;
    }
    setUpdating(`${reservation._id}:${nextStatus}`);
    try {
      await updateReservation(reservation, { status: nextStatus }, `${reservation.name}: ${statusLabel('reservation', nextStatus)}`);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setUpdating(null);
    }
  }

  const columns = [
    {
      key: 'when',
      header: 'When',
      render: (r) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold tabular-nums text-ink">{r.time}</p>
          <p className="text-xs text-muted-dark">{friendlyDay(r.date)}</p>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Guest',
      render: (r) => (
        <div className="min-w-[10rem]">
          <button type="button" onClick={() => setSelected(r)} className={cx(LINK, 'text-left')}>
            {r.name}
            <span className="sr-only">, view booking</span>
          </button>
          <p className="text-xs text-muted-dark">{r.phone}</p>
        </div>
      ),
    },
    {
      key: 'guests',
      header: 'Party',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Users aria-hidden="true" className="size-4 text-muted-dark" />
          {r.guests}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Ref',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink/75">{r.reference}</span>
          {r.isDemo && <DemoBadge />}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge kind="reservation" status={r.status} /> },
    {
      key: 'requests',
      header: 'Requests',
      render: (r) =>
        r.requests ? (
          <span className="line-clamp-2 max-w-[14rem] text-xs text-ink/75" title={r.requests}>
            {r.requests}
          </span>
        ) : (
          <span className="text-muted-dark">—</span>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (r) => {
        const primary = (RESERVATION_ACTIONS[r.status] ?? []).find((s) => !DESTRUCTIVE.has(s));
        return (
          <div className="flex items-center justify-end gap-1">
            {primary && (
              <button
                type="button"
                className="btn btn-sm btn-dark px-3"
                disabled={Boolean(updating)}
                onClick={() => changeStatus(r, primary)}
                aria-label={`${RESERVATION_ACTION_LABELS[primary]} — ${r.name}, ${r.time}`}
              >
                {updating === `${r._id}:${primary}` && <Spinner className="size-4" />}
                {RESERVATION_ACTION_LABELS[primary]}
              </button>
            )}
            <button type="button" className="btn btn-sm btn-outline-dark px-3" onClick={() => setSelected(r)}>
              View<span className="sr-only"> booking for {r.name}</span>
            </button>
          </div>
        );
      },
    },
  ];

  const viewLabel = view === 'upcoming' ? 'all upcoming dates' : friendlyDay(date);

  return (
    <div className="space-y-6">
      <PageHeader description="Table bookings from the website. Confirm new requests, then mark guests as seated and completed during service." />

      <Toolbar>
        <div role="group" aria-label="Date range" className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={dateInputId} className="field-label text-ink">
              Date
            </label>
            <input
              id={dateInputId}
              type="date"
              className="field w-auto"
              value={view === 'date' ? date : ''}
              onChange={resetPage((e) => {
                if (!e.target.value) return;
                setDate(e.target.value);
                setView('date');
              })}
            />
          </div>
          <button
            type="button"
            className={CHIP_LIGHT}
            aria-pressed={view === 'date' && date === today}
            onClick={resetPage(() => {
              setDate(today);
              setView('date');
            })}
          >
            Today
          </button>
          <button
            type="button"
            className={CHIP_LIGHT}
            aria-pressed={view === 'upcoming'}
            onClick={resetPage(() => setView('upcoming'))}
          >
            All upcoming
          </button>
        </div>
        <SelectInput label="Status" value={status} onChange={resetPage((e) => setStatus(e.target.value))} className="md:w-48">
          <option value="">All statuses</option>
          {RESERVATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META.reservation[s].label}
            </option>
          ))}
        </SelectInput>
        <div className="md:w-72">
          <span className="field-label text-ink" aria-hidden="true">
            Search
          </span>
          <SearchInput
            value={search}
            onChange={resetPage(setSearch)}
            label="Search reservations"
            placeholder="Name, phone or reference…"
          />
        </div>
      </Toolbar>

      <Card>
        {q.error && !q.data ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : (
          <DataTable
            caption={`Reservations for ${viewLabel}`}
            columns={columns}
            rows={list.data}
            loading={q.loading}
            busy={q.loading && list.data.length > 0}
            minWidth="900px"
            rowClassName={(r) => (['cancelled', 'no-show'].includes(r.status) ? 'opacity-60' : undefined)}
            empty={
              <EmptyState
                icon={CalendarDays}
                title={`No reservations for ${viewLabel}`}
                description={status || debouncedSearch ? 'Try clearing the status filter or search.' : 'New bookings from the website will appear here.'}
              />
            }
          />
        )}
      </Card>

      <Pagination page={list.page} pages={list.pages} total={list.total} onPageChange={setPage} noun="reservation" label="Reservations pages" />

      <ReservationDrawer
        reservation={current}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onChangeStatus={changeStatus}
        onSaveNotes={(r, notes) => updateReservation(r, { adminNotes: notes }, 'Notes saved.')}
        updating={updating}
      />
    </div>
  );
}

function ReservationDrawer({ reservation, open, onClose, onChangeStatus, onSaveNotes, updating }) {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const reservationId = reservation?._id;

  useEffect(() => {
    if (open) setNotes(reservation?.adminNotes ?? '');
  }, [open, reservationId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!reservation) return <Drawer open={false} onClose={onClose} title="" />;

  const actions = RESERVATION_ACTIONS[reservation.status] ?? [];
  const notesDirty = notes !== (reservation.adminNotes ?? '');

  async function saveNotes(e) {
    e.preventDefault();
    setSavingNotes(true);
    try {
      await onSaveNotes(reservation, notes.trim());
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${reservation.name} · ${pluralise(reservation.guests ?? 0, 'guest')}`}
      description={`${formatCalendarDate(reservation.date)} at ${reservation.time} · ${reservation.reference ?? ''}`}
      headerExtra={reservation.isDemo ? <DemoBadge className="mt-1" /> : null}
      footer={
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="space-y-7">
        <section aria-labelledby="res-status">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id="res-status" className="font-display text-base font-bold">
              Status
            </h3>
            <StatusBadge kind="reservation" status={reservation.status} />
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={DESTRUCTIVE.has(s) ? BTN_DANGER : 'btn btn-sm btn-dark'}
                  disabled={Boolean(updating)}
                  onClick={() => onChangeStatus(reservation, s)}
                >
                  {updating === `${reservation._id}:${s}` && <Spinner className="size-4" />}
                  {RESERVATION_ACTION_LABELS[s]}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-dark">This booking is closed.</p>
          )}
          <SelectInput
            label="Correct the status"
            className="mt-4 max-w-xs"
            value={reservation.status}
            hint="Use this to fix a mistake."
            disabled={Boolean(updating)}
            onChange={(e) => onChangeStatus(reservation, e.target.value)}
          >
            {RESERVATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META.reservation[s].label}
              </option>
            ))}
          </SelectInput>
        </section>

        <section aria-labelledby="res-details">
          <h3 id="res-details" className="mb-3 font-display text-base font-bold">
            Details
          </h3>
          <DetailList
            items={[
              { label: 'Date', value: formatCalendarDate(reservation.date) },
              { label: 'Time', value: reservation.time },
              { label: 'Party size', value: pluralise(reservation.guests ?? 0, 'guest') },
              { label: 'Reference', value: <span className="font-mono">{reservation.reference}</span> },
              {
                label: 'Phone',
                value: reservation.phone ? (
                  <a href={telHref(reservation.phone)} className={LINK}>
                    {reservation.phone}
                  </a>
                ) : null,
              },
              {
                label: 'Email',
                value: reservation.email ? (
                  <a href={mailtoHref(reservation.email, `Your Fuji reservation ${reservation.reference ?? ''}`)} className={LINK}>
                    {reservation.email}
                  </a>
                ) : null,
              },
              {
                label: 'Requests',
                full: true,
                value: reservation.requests ? <span className="whitespace-pre-line">{reservation.requests}</span> : 'None',
              },
              { label: 'Booked', value: formatDateTime(reservation.createdAt) },
            ]}
          />
        </section>

        <section aria-labelledby="res-notes">
          <h3 id="res-notes" className="mb-3 font-display text-base font-bold">
            Admin notes
          </h3>
          <form onSubmit={saveNotes} className="space-y-3">
            <TextArea
              label="Internal notes"
              rows={4}
              maxLength={2000}
              hint="Only visible to staff."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" className="btn btn-sm btn-primary" disabled={!notesDirty || savingNotes}>
              {savingNotes && <Spinner className="size-4" />}
              Save notes
            </button>
          </form>
        </section>
      </div>
    </Drawer>
  );
}
