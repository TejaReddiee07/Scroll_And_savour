import { useEffect, useState } from 'react';
import { ChefHat, Mail, Phone } from 'lucide-react';
import { api } from '../lib/api.js';
import { normalizeList, patchInList } from '../lib/data.js';
import { CATERING_STATUSES, EVENT_TYPE_LABELS, PLATTER_LABELS, STATUS_META, statusLabel } from '../lib/constants.js';
import { formatCalendarDate, formatDateTime, humanise, mailtoHref, pluralise, relativeTime, telHref } from '../lib/format.js';
import { useApiQuery } from '../lib/hooks.js';
import { useStats } from '../lib/stats.jsx';
import { Card, DetailList, PageHeader } from '../components/Card.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Drawer } from '../components/Dialog.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { FilterChips } from '../components/Filters.jsx';
import { TextArea } from '../components/FormControls.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { CHIP_LIGHT, LINK } from '../components/ui.js';
import { cx } from '../lib/cx.js';

const PAGE_SIZE = 20;
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  ...CATERING_STATUSES.map((s) => ({ value: s, label: STATUS_META.catering[s].label })),
];

export default function CateringPage() {
  const toast = useToast();
  const { reload: reloadStats } = useStats();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const q = useApiQuery('/admin/catering', { query: { status, page, limit: PAGE_SIZE } });
  const list = normalizeList(q.data);
  const current = selected ? list.data.find((e) => e._id === selected._id) ?? selected : null;

  async function updateEnquiry(enquiry, patch, message) {
    const updated = await api.patch(`/admin/catering/${enquiry._id}`, patch);
    const merged = { ...enquiry, ...(updated ?? patch) };
    q.setData((d) => patchInList(d, enquiry._id, merged));
    setSelected((s) => (s && s._id === enquiry._id ? merged : s));
    toast.success(message);
    q.reload();
    reloadStats();
  }

  const columns = [
    {
      key: 'name',
      header: 'Enquiry',
      render: (e) => (
        <div className="min-w-[10rem]">
          <button type="button" onClick={() => setSelected(e)} className={cx(LINK, 'text-left')}>
            {e.name}
            <span className="sr-only">, view enquiry</span>
          </button>
          <p className="font-mono text-xs text-muted-dark">{e.reference}</p>
        </div>
      ),
    },
    { key: 'eventType', header: 'Event', render: (e) => EVENT_TYPE_LABELS[e.eventType] ?? humanise(e.eventType) },
    { key: 'date', header: 'Event date', className: 'whitespace-nowrap', render: (e) => (e.date ? formatCalendarDate(e.date) : '—') },
    { key: 'guests', header: 'Guests', align: 'right', className: 'tabular-nums', render: (e) => e.guests ?? '—' },
    { key: 'budget', header: 'Budget', render: (e) => e.budget || <span className="text-muted-dark">—</span> },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge kind="catering" status={e.status} /> },
    {
      key: 'createdAt',
      header: 'Received',
      className: 'whitespace-nowrap text-ink/70',
      render: (e) => (
        <time dateTime={e.createdAt} title={formatDateTime(e.createdAt)}>
          {relativeTime(e.createdAt)}
        </time>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (e) => (
        <button type="button" className="btn btn-sm btn-outline-dark px-3" onClick={() => setSelected(e)}>
          Open<span className="sr-only"> enquiry from {e.name}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader description="Event and party catering requests from the website. Reply by email or phone, then track each enquiry through to booking." />

      <FilterChips
        label="Filter by status"
        options={STATUS_FILTERS}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />

      <Card>
        {q.error && !q.data ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : (
          <DataTable
            caption="Catering enquiries, newest first"
            columns={columns}
            rows={list.data}
            loading={q.loading}
            busy={q.loading && list.data.length > 0}
            minWidth="880px"
            rowClassName={(e) => (e.status === 'new' ? 'bg-sky-50/40' : undefined)}
            empty={
              <EmptyState
                icon={ChefHat}
                title={status ? `No ${statusLabel('catering', status).toLowerCase()} enquiries` : 'No catering enquiries yet'}
                description="Enquiries from the catering form will appear here."
              />
            }
          />
        )}
      </Card>

      <Pagination page={list.page} pages={list.pages} total={list.total} onPageChange={setPage} noun="enquiry" label="Catering pages" />

      <EnquiryDrawer enquiry={current} open={Boolean(selected)} onClose={() => setSelected(null)} onUpdate={updateEnquiry} />
    </div>
  );
}

function EnquiryDrawer({ enquiry, open, onClose, onUpdate }) {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(null); // 'status:<s>' | 'notes'
  const enquiryId = enquiry?._id;

  useEffect(() => {
    if (open) setNotes(enquiry?.adminNotes ?? '');
  }, [open, enquiryId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!enquiry) return <Drawer open={false} onClose={onClose} title="" />;

  async function run(key, patch, message) {
    setSaving(key);
    try {
      await onUpdate(enquiry, patch, message);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(null);
    }
  }

  const subject = `Your catering enquiry ${enquiry.reference ?? ''} — Fuji Japanese Restaurant`.replace(/\s+/g, ' ');
  const platters = (enquiry.platters ?? []).map((p) => PLATTER_LABELS[p] ?? humanise(p));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={`${EVENT_TYPE_LABELS[enquiry.eventType] ?? 'Catering'} enquiry · ${enquiry.name}`}
      description={`${enquiry.reference ?? ''} · received ${formatDateTime(enquiry.createdAt)}`}
      footer={
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="space-y-7">
        <div className="flex flex-wrap gap-2">
          {enquiry.email && (
            <a href={mailtoHref(enquiry.email, subject)} className="btn btn-sm btn-primary">
              <Mail aria-hidden="true" className="size-4" />
              Email {(enquiry.name || '').split(' ')[0] || 'customer'}
            </a>
          )}
          {enquiry.phone && (
            <a href={telHref(enquiry.phone)} className="btn btn-sm btn-outline-dark">
              <Phone aria-hidden="true" className="size-4" />
              Call {enquiry.phone}
            </a>
          )}
        </div>

        <section aria-labelledby="cat-status">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id="cat-status" className="font-display text-base font-bold">
              Status
            </h3>
            <StatusBadge kind="catering" status={enquiry.status} />
          </div>
          <div role="group" aria-label="Set enquiry status" className="flex flex-wrap gap-2">
            {CATERING_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={CHIP_LIGHT}
                aria-pressed={enquiry.status === s}
                disabled={Boolean(saving)}
                onClick={() => enquiry.status !== s && run(`status:${s}`, { status: s }, `Marked as ${statusLabel('catering', s).toLowerCase()}.`)}
              >
                {saving === `status:${s}` && <Spinner className="size-3.5" />}
                {STATUS_META.catering[s].label}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="cat-details">
          <h3 id="cat-details" className="mb-3 font-display text-base font-bold">
            Event
          </h3>
          <DetailList
            items={[
              { label: 'Event type', value: EVENT_TYPE_LABELS[enquiry.eventType] ?? humanise(enquiry.eventType) },
              { label: 'Date', value: enquiry.date ? formatCalendarDate(enquiry.date) : null },
              { label: 'Guests', value: enquiry.guests != null ? pluralise(enquiry.guests, 'guest') : null },
              { label: 'Budget', value: enquiry.budget || null },
              { label: 'Platters', full: true, value: platters.length ? platters.join(', ') : 'None selected' },
              {
                label: 'Message',
                full: true,
                value: enquiry.message ? <span className="whitespace-pre-line">{enquiry.message}</span> : 'No message',
              },
            ]}
          />
        </section>

        <section aria-labelledby="cat-contact">
          <h3 id="cat-contact" className="mb-3 font-display text-base font-bold">
            Contact
          </h3>
          <DetailList
            items={[
              { label: 'Name', value: enquiry.name },
              {
                label: 'Email',
                value: enquiry.email ? (
                  <a href={mailtoHref(enquiry.email, subject)} className={LINK}>
                    {enquiry.email}
                  </a>
                ) : null,
              },
              {
                label: 'Phone',
                value: enquiry.phone ? (
                  <a href={telHref(enquiry.phone)} className={LINK}>
                    {enquiry.phone}
                  </a>
                ) : null,
              },
            ]}
          />
        </section>

        <section aria-labelledby="cat-notes">
          <h3 id="cat-notes" className="mb-3 font-display text-base font-bold">
            Admin notes
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run('notes', { adminNotes: notes.trim() }, 'Notes saved.');
            }}
            className="space-y-3"
          >
            <TextArea
              label="Internal notes"
              rows={4}
              maxLength={2000}
              hint="Quotes, menus discussed, follow-up dates. Only visible to staff."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving === 'notes' || notes === (enquiry.adminNotes ?? '')}>
              {saving === 'notes' && <Spinner className="size-4" />}
              Save notes
            </button>
          </form>
        </section>
      </div>
    </Drawer>
  );
}
