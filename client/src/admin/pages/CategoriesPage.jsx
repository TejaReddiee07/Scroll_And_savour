import { useEffect, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { asArray } from '../lib/data.js';
import { applyServerErrors } from '../lib/forms.js';
import { pluralise } from '../lib/format.js';
import { useApiQuery } from '../lib/hooks.js';
import { useStats } from '../lib/stats.jsx';
import { Card, PageHeader } from '../components/Card.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Modal } from '../components/Dialog.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { FormAlert, Switch, TextArea, TextInput } from '../components/FormControls.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { Badge } from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { ICON_BTN, ICON_BTN_DANGER, LINK } from '../components/ui.js';
import { Link } from 'react-router-dom';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Keep it under 80 characters'),
  slug: z
    .string()
    .trim()
    .max(80, 'Keep it under 80 characters')
    .refine((v) => v === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), 'Lowercase letters, numbers and single hyphens only'),
  jp: z.string().trim().max(40, 'Keep it under 40 characters'),
  intro: z.string().trim().max(500, 'Keep it under 500 characters'),
  note: z.string().trim().max(500, 'Keep it under 500 characters'),
  order: z.string().trim().regex(/^\d{0,4}$/, 'Use a whole number'),
  active: z.boolean(),
});

const FIELDS = Object.keys(schema.shape);

function toFormValues(category) {
  return {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    jp: category?.jp ?? '',
    intro: category?.intro ?? '',
    note: category?.note ?? '',
    order: category?.order != null ? String(category.order) : '',
    active: category ? category.active !== false : true,
  };
}

function toPayload(values) {
  const payload = {
    name: values.name.trim(),
    jp: values.jp.trim(),
    intro: values.intro.trim(),
    note: values.note.trim(),
    active: values.active,
  };
  if (values.slug.trim()) payload.slug = values.slug.trim();
  if (values.order !== '') payload.order = Number(values.order);
  return payload;
}

export default function CategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { reload: reloadStats } = useStats();
  const q = useApiQuery('/admin/categories');
  const [editor, setEditor] = useState({ open: false, category: null });

  const categories = useMemo(
    () => asArray(q.data).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
    [q.data],
  );

  async function deleteCategory(category) {
    const count = category.itemCount ?? 0;
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      message:
        count > 0
          ? `This category still has ${pluralise(count, 'item')}. The server will refuse to delete it until those items are moved or deleted.`
          : 'The empty category will be removed from the menu.',
      confirmLabel: 'Delete category',
    });
    if (!ok) return;
    try {
      await api.del(`/admin/categories/${category._id}`);
      toast.success(`Deleted “${category.name}”.`);
      q.reload();
      reloadStats();
    } catch (err) {
      // 409 CATEGORY_NOT_EMPTY → show the server's explanation.
      toast.apiError(err);
    }
  }

  const columns = [
    { key: 'order', header: '#', className: 'w-12 tabular-nums text-muted-dark', render: (c) => c.order ?? '—' },
    {
      key: 'name',
      header: 'Category',
      render: (c) => (
        <div className="min-w-[12rem]">
          <p className="font-semibold text-ink">
            {c.name}
            {c.jp && (
              <span lang="ja" className="ml-2 font-display font-normal text-muted-dark">
                {c.jp}
              </span>
            )}
          </p>
          {c.intro && <p className="line-clamp-1 max-w-md text-xs text-muted-dark">{c.intro}</p>}
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (c) => <span className="font-mono text-xs text-ink/75">{c.slug}</span> },
    {
      key: 'itemCount',
      header: 'Items',
      align: 'right',
      className: 'tabular-nums',
      render: (c) =>
        (c.itemCount ?? 0) > 0 ? (
          <Link to={`/admin/menu?category=${encodeURIComponent(c.slug)}`} className={LINK}>
            {c.itemCount}
            <span className="sr-only"> items in {c.name}</span>
          </Link>
        ) : (
          <span className="text-muted-dark">0</span>
        ),
    },
    {
      key: 'active',
      header: 'Visibility',
      render: (c) =>
        c.active === false ? (
          <Badge tone="neutral">Hidden</Badge>
        ) : (
          <Badge tone="success" dot>
            Active
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button type="button" className={ICON_BTN} onClick={() => setEditor({ open: true, category: c })} aria-label={`Edit ${c.name}`}>
            <Pencil aria-hidden="true" className="size-4" />
          </button>
          <button type="button" className={ICON_BTN_DANGER} onClick={() => deleteCategory(c)} aria-label={`Delete ${c.name}`}>
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description="Menu sections in display order. Hidden categories (and their items) are not shown on the public menu."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditor({ open: true, category: null })}>
            <Plus aria-hidden="true" className="size-4" />
            Add category
          </button>
        }
      />

      <Card>
        {q.error && !q.data ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : (
          <DataTable
            caption="Menu categories"
            columns={columns}
            rows={categories}
            loading={q.loading}
            minWidth="720px"
            empty={
              <EmptyState
                icon={Layers}
                title="No categories yet"
                description="Create a category before adding menu items."
                action={
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditor({ open: true, category: null })}>
                    <Plus aria-hidden="true" className="size-4" /> Add category
                  </button>
                }
              />
            }
          />
        )}
      </Card>
      {categories.length > 0 && <p className="text-sm text-muted-dark">{pluralise(categories.length, 'category', 'categories')}</p>}

      <CategoryEditor
        open={editor.open}
        category={editor.category}
        nextOrder={categories.reduce((max, c) => Math.max(max, c.order ?? 0), 0) + 1}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={() => {
          setEditor((e) => ({ ...e, open: false }));
          q.reload();
          reloadStats();
        }}
      />
    </div>
  );
}

function CategoryEditor({ open, category, nextOrder, onClose, onSaved }) {
  const toast = useToast();
  const formId = useId();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(null) });

  const categoryId = category?._id;
  useEffect(() => {
    if (!open) return;
    reset(category ? toFormValues(category) : { ...toFormValues(null), order: String(nextOrder) });
    setFormError('');
  }, [open, categoryId, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values) {
    setFormError('');
    const payload = toPayload(values);
    try {
      if (category) await api.patch(`/admin/categories/${category._id}`, payload);
      else await api.post('/admin/categories', payload);
      toast.success(category ? `Saved “${payload.name}”.` : `Added “${payload.name}”.`);
      onSaved();
    } catch (err) {
      const leftovers = applyServerErrors(err, setError, FIELDS);
      toast.error(errorMessage(err));
      if (leftovers.length) setFormError(leftovers.join(' '));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      dismissible={!isSubmitting}
      title={category ? `Edit ${category.name}` : 'Add category'}
      footer={
        <>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn-sm btn-primary" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="size-4" />}
            {category ? 'Save changes' : 'Add category'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormAlert>{formError}</FormAlert>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Name" required error={errors.name?.message} data-autofocus autoComplete="off" {...register('name')} />
          <TextInput
            label="Japanese label"
            optional
            lang="ja"
            placeholder="e.g. 前菜"
            error={errors.jp?.message}
            autoComplete="off"
            {...register('jp')}
          />
          <TextInput
            label="Slug"
            optional
            placeholder="Generated from the name"
            hint="Used in URLs and menu filters. Changing it can break existing links."
            error={errors.slug?.message}
            autoComplete="off"
            {...register('slug')}
          />
          <TextInput label="Display order" inputMode="numeric" error={errors.order?.message} {...register('order')} />
        </div>
        <TextArea label="Intro" optional rows={2} error={errors.intro?.message} {...register('intro')} />
        <TextArea
          label="Note"
          optional
          rows={2}
          hint="Small print shown under the category, e.g. “Served with miso soup”."
          error={errors.note?.message}
          {...register('note')}
        />
        <Switch label="Active" description="Show this category on the public menu." {...register('active')} />
      </form>
    </Modal>
  );
}
