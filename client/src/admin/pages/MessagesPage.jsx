import { useState } from 'react';
import { Archive, ArchiveRestore, Inbox, Mail, MailOpen, Phone, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { normalizeList, patchInList } from '../lib/data.js';
import { MESSAGE_STATUSES, STATUS_META } from '../lib/constants.js';
import { formatDateTime, mailtoHref, relativeTime, telHref } from '../lib/format.js';
import { useApiQuery } from '../lib/hooks.js';
import { useStats } from '../lib/stats.jsx';
import { Card, PageHeader } from '../components/Card.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Drawer } from '../components/Dialog.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { FilterChips } from '../components/Filters.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { BTN_DANGER, LINK } from '../components/ui.js';
import { cx } from '../lib/cx.js';

const PAGE_SIZE = 20;
const FILTERS = [
  { value: '', label: 'All' },
  ...MESSAGE_STATUSES.map((s) => ({ value: s, label: STATUS_META.message[s].label })),
];

export default function MessagesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { stats, reload: reloadStats } = useStats();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null);

  const q = useApiQuery('/admin/messages', { query: { status, page, limit: PAGE_SIZE } });
  const list = normalizeList(q.data);
  const current = selected ? list.data.find((m) => m._id === selected._id) ?? selected : null;
  const unreadCount = stats?.pending?.unreadMessages;

  async function setMessageStatus(message, nextStatus, { quiet = false } = {}) {
    setBusy(`status:${nextStatus}`);
    q.setData((d) => patchInList(d, message._id, { status: nextStatus }));
    setSelected((s) => (s && s._id === message._id ? { ...s, status: nextStatus } : s));
    try {
      const updated = await api.patch(`/admin/messages/${message._id}`, { status: nextStatus });
      if (updated) q.setData((d) => patchInList(d, message._id, updated));
      if (!quiet) {
        toast.success(
          nextStatus === 'archived' ? 'Message archived.' : nextStatus === 'unread' ? 'Marked as unread.' : 'Moved back to the inbox.',
        );
      }
      q.reload();
      reloadStats();
      return true;
    } catch (err) {
      q.setData((d) => patchInList(d, message._id, { status: message.status }));
      setSelected((s) => (s && s._id === message._id ? { ...s, status: message.status } : s));
      toast.apiError(err);
      return false;
    } finally {
      setBusy(null);
    }
  }

  function openMessage(message) {
    setSelected(message);
    if (message.status === 'unread') setMessageStatus(message, 'read', { quiet: true });
  }

  async function archive(message) {
    const next = message.status === 'archived' ? 'read' : 'archived';
    const ok = await setMessageStatus(message, next);
    // Close the drawer if the message no longer belongs to the current filter.
    if (ok && status && status !== next) setSelected(null);
  }

  async function remove(message) {
    const ok = await confirm({
      title: 'Delete this message?',
      message: `The message from ${message.name} will be permanently deleted. Archive it instead if you might need it later.`,
      confirmLabel: 'Delete message',
    });
    if (!ok) return;
    setBusy('delete');
    try {
      await api.del(`/admin/messages/${message._id}`);
      toast.success('Message deleted.');
      setSelected(null);
      if (list.data.length === 1 && page > 1) setPage(page - 1);
      else q.reload();
      reloadStats();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBusy(null);
    }
  }

  const columns = [
    {
      key: 'from',
      header: 'From',
      render: (m) => {
        const unread = m.status === 'unread';
        return (
          <div className="flex min-w-[11rem] items-start gap-2.5">
            <span
              aria-hidden="true"
              className={cx('mt-2 size-2 shrink-0 rounded-full', unread ? 'bg-fuji-red' : 'bg-transparent')}
            />
            <div className="min-w-0">
              <p className={cx('truncate text-ink', unread ? 'font-bold' : 'font-medium')}>{m.name}</p>
              <p className="truncate text-xs text-muted-dark">{m.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'subject',
      header: 'Message',
      render: (m) => {
        const unread = m.status === 'unread';
        return (
          <button type="button" onClick={() => openMessage(m)} className="group block max-w-xl text-left">
            <span className={cx('block truncate text-ink group-hover:text-fuji-red group-hover:underline', unread ? 'font-bold' : 'font-medium')}>
              {unread && <span className="sr-only">Unread: </span>}
              {m.subject || '(no subject)'}
            </span>
            <span className="line-clamp-1 text-xs text-muted-dark">{m.message}</span>
          </button>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Received',
      className: 'whitespace-nowrap text-ink/70',
      render: (m) => (
        <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>
          {relativeTime(m.createdAt)}
        </time>
      ),
    },
    { key: 'status', header: 'Status', render: (m) => <StatusBadge kind="message" status={m.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          typeof unreadCount === 'number'
            ? `Messages from the contact form. ${unreadCount === 0 ? 'You’re all caught up.' : `${unreadCount} unread.`} Opening a message marks it as read.`
            : 'Messages from the contact form. Opening a message marks it as read.'
        }
      />

      <FilterChips
        label="Filter messages"
        options={FILTERS}
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
            caption="Contact messages, newest first"
            columns={columns}
            rows={list.data}
            loading={q.loading}
            busy={q.loading && list.data.length > 0}
            minWidth="720px"
            rowClassName={(m) => (m.status === 'unread' ? 'bg-sky-50/50' : m.status === 'archived' ? 'opacity-70' : undefined)}
            empty={
              <EmptyState
                icon={Inbox}
                title={status === 'unread' ? 'No unread messages' : status === 'archived' ? 'Nothing archived' : 'No messages yet'}
                description="Messages sent through the website’s contact form will appear here."
              />
            }
          />
        )}
      </Card>

      <Pagination page={list.page} pages={list.pages} total={list.total} onPageChange={setPage} noun="message" label="Messages pages" />

      <MessageDrawer
        message={current}
        open={Boolean(selected)}
        busy={busy}
        onClose={() => setSelected(null)}
        onArchive={archive}
        onMarkUnread={(m) => setMessageStatus(m, 'unread')}
        onDelete={remove}
      />
    </div>
  );
}

function MessageDrawer({ message, open, busy, onClose, onArchive, onMarkUnread, onDelete }) {
  if (!message) return <Drawer open={false} onClose={onClose} title="" />;
  const archived = message.status === 'archived';
  const replySubject = message.subject ? `Re: ${message.subject}` : 'Your message to Fuji Japanese Restaurant';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={message.subject || '(no subject)'}
      description={`From ${message.name} · ${formatDateTime(message.createdAt)}`}
      footer={
        <>
          <button type="button" className={cx(BTN_DANGER, 'mr-auto')} onClick={() => onDelete(message)} disabled={Boolean(busy)}>
            {busy === 'delete' ? <Spinner className="size-4" /> : <Trash2 aria-hidden="true" className="size-4" />}
            Delete
          </button>
          {message.status === 'read' && (
            <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => onMarkUnread(message)} disabled={Boolean(busy)}>
              <MailOpen aria-hidden="true" className="size-4" />
              Mark unread
            </button>
          )}
          <button type="button" className="btn btn-sm btn-dark" onClick={() => onArchive(message)} disabled={Boolean(busy)}>
            {busy === 'status:archived' || (archived && busy === 'status:read') ? (
              <Spinner className="size-4" />
            ) : archived ? (
              <ArchiveRestore aria-hidden="true" className="size-4" />
            ) : (
              <Archive aria-hidden="true" className="size-4" />
            )}
            {archived ? 'Unarchive' : 'Archive'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="message" status={message.status} />
        </div>
        <dl className="grid gap-3 rounded-xl bg-cream/50 p-4 text-sm ring-1 ring-ink/5 sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt className="font-semibold text-muted-dark">Name</dt>
          <dd className="text-ink">{message.name}</dd>
          <dt className="font-semibold text-muted-dark">Email</dt>
          <dd className="break-all">
            <a href={mailtoHref(message.email, replySubject)} className={LINK}>
              {message.email}
            </a>
          </dd>
          {message.phone && (
            <>
              <dt className="font-semibold text-muted-dark">Phone</dt>
              <dd>
                <a href={telHref(message.phone)} className={LINK}>
                  {message.phone}
                </a>
              </dd>
            </>
          )}
        </dl>
        <div className="whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-ink">{message.message}</div>
        <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-5">
          <a href={mailtoHref(message.email, replySubject)} className="btn btn-sm btn-primary">
            <Mail aria-hidden="true" className="size-4" />
            Reply by email
          </a>
          {message.phone && (
            <a href={telHref(message.phone)} className="btn btn-sm btn-outline-dark">
              <Phone aria-hidden="true" className="size-4" />
              Call
            </a>
          )}
        </div>
      </div>
    </Drawer>
  );
}
