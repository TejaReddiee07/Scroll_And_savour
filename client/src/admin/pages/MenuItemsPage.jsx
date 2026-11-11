import { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Flame, ImageOff, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { photoFor } from '../../data/photos';
import { showsCutout, uploadedThumb } from '../../lib/media';
import { api, errorMessage } from '../lib/api.js';
import { asArray, mergeRecord, normalizeList, patchInList } from '../lib/data.js';
import { DIETARY_OPTIONS, TAG_OPTIONS } from '../lib/constants.js';
import { applyServerErrors, MONEY_RE, moneyToInput, parseMoney } from '../lib/forms.js';
import { formatDateTime, formatGBP, relativeTime } from '../lib/format.js';
import { useApiQuery, useDebouncedValue, usePendingIds } from '../lib/hooks.js';
import { useStats } from '../lib/stats.jsx';
import { Card, PageHeader } from '../components/Card.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { Drawer } from '../components/Dialog.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { SearchInput, Toolbar } from '../components/Filters.jsx';
import { Checkbox, FormAlert, SelectInput, Switch, TextArea, TextInput } from '../components/FormControls.jsx';
import { ImageUpload } from '../components/ImageUpload.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { Badge } from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { BTN_DANGER, ICON_BTN, ICON_BTN_DANGER } from '../components/ui.js';
import { cx } from '../lib/cx.js';

const PAGE_SIZE = 20;

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120, 'Keep the name under 120 characters'),
  category: z.string().min(1, 'Choose a category'),
  price: z
    .string()
    .trim()
    .min(1, 'Enter a price')
    .regex(MONEY_RE, 'Enter a price in pounds, e.g. 12.95'),
  description: z.string().max(1000, 'Keep the description under 1000 characters'),
  dietary: z.preprocess(toArray, z.array(z.enum(['vegetarian', 'vegan', 'gluten-free']))),
  tags: z.preprocess(toArray, z.array(z.enum(['popular', 'chefs-pick', 'spicy']))),
  hot: z.boolean(),
  allergens: z.string().max(500, 'Too long'),
  art: z
    .string()
    .trim()
    .max(80, 'Too long')
    .refine((v) => v === '' || /^[a-z0-9-]+(:[a-z0-9-]+)?$/i.test(v), 'Use a key like “ramen” or “maki:salmon”'),
  order: z.string().trim().regex(/^\d{0,5}$/, 'Use a whole number'),
  available: z.boolean(),
  image: z
    .object({
      url: z.string(),
      publicId: z.string().optional().nullable(),
      illustrative: z.boolean(),
      width: z.number().optional(),
      height: z.number().optional(),
      cutout: z
        .object({ url: z.string(), publicId: z.string().optional(), width: z.number().optional(), height: z.number().optional() })
        .nullable()
        .optional(),
      display: z.enum(['cutout', 'photo']).optional(),
    })
    .nullable(),
});

const FORM_FIELDS = Object.keys(itemSchema.shape);

function imageValue(image) {
  return {
    url: image.url,
    publicId: image.publicId || '',
    illustrative: Boolean(image.illustrative),
    display: image.display === 'photo' ? 'photo' : 'cutout',
    ...(image.width && image.height ? { width: image.width, height: image.height } : {}),
    ...(image.cutout?.url
      ? {
          cutout: {
            url: image.cutout.url,
            publicId: image.cutout.publicId || '',
            ...(image.cutout.width && image.cutout.height ? { width: image.cutout.width, height: image.cutout.height } : {}),
          },
        }
      : {}),
  };
}

function toFormValues(item, defaultCategoryId = '') {
  return {
    name: item?.name ?? '',
    category: item?.category?._id ?? (typeof item?.category === 'string' ? item.category : defaultCategoryId),
    price: moneyToInput(item?.price),
    description: item?.description ?? '',
    dietary: item?.dietary ?? [],
    tags: item?.tags ?? [],
    hot: Boolean(item?.hot),
    allergens: (item?.allergens ?? []).join(', '),
    art: item?.art ?? '',
    order: item?.order != null ? String(item.order) : '',
    available: item ? item.available !== false : true,
    image: item?.image?.url ? imageValue(item.image) : null,
  };
}

function toPayload(values) {
  const payload = {
    name: values.name.trim(),
    category: values.category,
    price: parseMoney(values.price),
    description: values.description.trim(),
    dietary: values.dietary,
    tags: values.tags,
    hot: values.hot,
    allergens: values.allergens
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    art: values.art.trim(),
    available: values.available,
    image: values.image ? imageValue(values.image) : null,
  };
  if (values.order !== '') payload.order = Number(values.order);
  return payload;
}

export default function MenuItemsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { reload: reloadStats } = useStats();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const [category, setCategory] = useState(() => params.get('category') ?? '');
  const [availability, setAvailability] = useState(() => {
    const value = params.get('available');
    return value === 'true' || value === 'false' ? value : '';
  });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [editor, setEditor] = useState({ open: false, item: null });
  const pending = usePendingIds();

  // /admin/menu?new=1 (dashboard quick link) opens the "Add item" drawer.
  useEffect(() => {
    if (params.get('new') !== '1') return;
    setEditor({ open: true, item: null });
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const categoriesQ = useApiQuery('/admin/categories');
  const itemsQ = useApiQuery('/admin/items', {
    query: { search: debouncedSearch, category, available: availability, page, limit: PAGE_SIZE },
  });

  const categories = useMemo(
    () => asArray(categoriesQ.data).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categoriesQ.data],
  );
  const list = normalizeList(itemsQ.data);
  const filtersActive = Boolean(debouncedSearch || category || availability);
  const defaultCategoryId = categories.find((c) => c.slug === category)?._id ?? '';

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  function clearFilters() {
    setSearch('');
    setCategory('');
    setAvailability('');
    setPage(1);
  }

  async function toggleAvailability(item) {
    const next = !item.available;
    pending.add(item._id);
    itemsQ.setData((d) => patchInList(d, item._id, { available: next }));
    try {
      const updated = await api.patch(`/admin/items/${item._id}`, { available: next });
      itemsQ.setData((d) => patchInList(d, item._id, (row) => mergeRecord(row, updated)));
      toast.success(`${item.name} is now ${next ? 'available' : 'unavailable'}.`);
      reloadStats();
    } catch (err) {
      itemsQ.setData((d) => patchInList(d, item._id, { available: item.available }));
      toast.apiError(err);
    } finally {
      pending.remove(item._id);
    }
  }

  /** Resolves true when the dish was deleted. */
  async function deleteItem(item) {
    const ok = await confirm({
      title: `Delete ${item.name}?`,
      message: (
        <>
          <p>It disappears from the website menu, ordering page and carts straight away.</p>
          <p className="mt-2">
            To hide it temporarily, switch <strong className="font-semibold text-ink">Available</strong> off instead.
          </p>
        </>
      ),
      confirmLabel: 'Delete dish',
      cancelLabel: 'Keep dish',
    });
    if (!ok) return false;
    try {
      await api.del(`/admin/items/${item._id}`);
      toast.success(`Deleted “${item.name}” — removed from the website.`);
      if (list.data.length === 1 && page > 1) setPage(page - 1);
      else itemsQ.reload();
      reloadStats();
      return true;
    } catch (err) {
      toast.apiError(err);
      return false;
    }
  }

  function handleSaved() {
    setEditor((e) => ({ ...e, open: false }));
    itemsQ.reload();
    reloadStats();
  }

  async function deleteFromEditor(item) {
    if (await deleteItem(item)) setEditor((e) => ({ ...e, open: false }));
  }

  const columns = [
    {
      key: 'name',
      header: 'Item',
      render: (item) => (
        <div className="flex min-w-[14rem] items-center gap-3">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-ink/10">
            {item.image?.url ? (
              <img
                src={uploadedThumb(item.image)}
                alt=""
                loading="lazy"
                decoding="async"
                className={showsCutout(item.image) ? 'size-full object-contain p-1' : 'size-full object-cover'}
                title="Photo uploaded by you"
              />
            ) : photoFor(item.itemId) ? (
              <img
                src={(photoFor(item.itemId).cutout || photoFor(item.itemId)).srcset.split(' ')[0]}
                alt=""
                loading="lazy"
                decoding="async"
                className={photoFor(item.itemId).cutout ? 'size-full object-contain p-1' : 'size-full object-cover'}
                title={photoFor(item.itemId).illustrative ? "Illustrative stock photo — upload the restaurant's own photo to replace it" : 'Restaurant photo'}
              />
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-dark" title="No photo yet — edit the dish to add one">
                <ImageOff aria-hidden="true" className="size-4" />
                No photo
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              {item.name}
              {item.hot && <Flame aria-label="Hot dish" className="size-3.5 shrink-0 text-orange-600" />}
            </span>
            <span className="block truncate font-mono text-[0.72rem] text-muted-dark">{item.itemId}</span>
            {(item.dietary?.length > 0 || item.tags?.length > 0 || item.image?.illustrative) && (
              <span className="mt-1 flex flex-wrap gap-1">
                {item.dietary?.map((d) => {
                  const opt = DIETARY_OPTIONS.find((o) => o.value === d);
                  return (
                    <Badge key={d} tone="success" className="px-1.5 text-[0.65rem]" title={opt?.label}>
                      <span aria-hidden="true">{opt?.short ?? d}</span>
                      <span className="sr-only">{opt?.label ?? d}</span>
                    </Badge>
                  );
                })}
                {item.tags?.map((t) => (
                  <Badge key={t} tone={t === 'spicy' ? 'danger' : 'gold'} className="px-1.5 text-[0.65rem]">
                    {TAG_OPTIONS.find((o) => o.value === t)?.label ?? t}
                  </Badge>
                ))}
                {item.image?.illustrative && (
                  <Badge tone="muted" className="px-1.5 text-[0.65rem]">
                    Illustrative photo
                  </Badge>
                )}
              </span>
            )}
          </span>
        </div>
      ),
    },
    { key: 'category', header: 'Category', className: 'text-ink/80', render: (item) => item.category?.name ?? '—' },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      className: 'tabular-nums font-medium',
      render: (item) => formatGBP(item.price),
    },
    {
      key: 'available',
      header: 'Available',
      render: (item) => (
        <Switch
          size="sm"
          label={`${item.name} available`}
          hideLabel
          checked={item.available !== false}
          disabled={pending.has(item._id)}
          onChange={() => toggleAvailability(item)}
        />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last updated',
      className: 'whitespace-nowrap text-ink/70',
      render: (item) =>
        item.updatedAt ? (
          <time dateTime={item.updatedAt} title={formatDateTime(item.updatedAt)}>
            {relativeTime(item.updatedAt)}
          </time>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (item) => (
        <div className="flex justify-end gap-1">
          <button type="button" className={ICON_BTN} onClick={() => setEditor({ open: true, item })} aria-label={`Edit ${item.name}`}>
            <Pencil aria-hidden="true" className="size-4" />
          </button>
          <button type="button" className={ICON_BTN_DANGER} onClick={() => deleteItem(item)} aria-label={`Delete ${item.name}`}>
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          <>
            Add, edit and remove dishes — changes go live on the website menu and ordering page straight away. Switch{' '}
            <strong className="font-semibold text-ink">Available</strong> off to pause a dish: unavailable dishes stay on the menu,
            greyed out, and can’t be ordered.
          </>
        }
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditor({ open: true, item: null })}>
            <Plus aria-hidden="true" className="size-4" />
            Add dish
          </button>
        }
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={updateFilter(setSearch)}
          label="Search menu items"
          placeholder="Search by name or ID…"
          className="md:w-72"
        />
        <SelectInput
          label="Category"
          hideLabel
          value={category}
          onChange={(e) => updateFilter(setCategory)(e.target.value)}
          className="md:w-56"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          label="Availability"
          hideLabel
          value={availability}
          onChange={(e) => updateFilter(setAvailability)(e.target.value)}
          className="md:w-48"
        >
          <option value="">Any availability</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </SelectInput>
        {filtersActive && (
          <button type="button" className="btn btn-sm text-ink/70 hover:text-fuji-red md:self-center" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </Toolbar>

      <Card>
        {itemsQ.error && !itemsQ.data ? (
          <ErrorState error={itemsQ.error} onRetry={itemsQ.refetch} />
        ) : (
          <DataTable
            caption="Menu items"
            columns={columns}
            rows={list.data}
            loading={itemsQ.loading}
            busy={itemsQ.loading && list.data.length > 0}
            minWidth="880px"
            empty={
              filtersActive ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No items match these filters"
                  description="Try a different search or clear the filters."
                  action={
                    <button type="button" className="btn btn-sm btn-outline-dark" onClick={clearFilters}>
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No menu items yet"
                  description="Add your first dish, or seed the database from menu.json (see README)."
                  action={
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditor({ open: true, item: null })}>
                      <Plus aria-hidden="true" className="size-4" /> Add dish
                    </button>
                  }
                />
              )
            }
          />
        )}
      </Card>

      <Pagination page={list.page} pages={list.pages} total={list.total} onPageChange={setPage} noun="item" label="Menu items pages" />

      <ItemEditor
        open={editor.open}
        item={editor.item}
        categories={categories}
        categoriesLoading={categoriesQ.loading}
        defaultCategoryId={defaultCategoryId}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={handleSaved}
        onDelete={deleteFromEditor}
      />
    </div>
  );
}

function ItemEditor({ open, item, categories, categoriesLoading, defaultCategoryId, onClose, onSaved, onDelete }) {
  const toast = useToast();
  const confirm = useConfirm();
  const formId = useId();
  const [formError, setFormError] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(itemSchema), defaultValues: toFormValues(null) });

  const itemId = item?._id;
  useEffect(() => {
    if (!open) return;
    reset(toFormValues(item, defaultCategoryId));
    setFormError('');
    // Reset only when the drawer opens or switches to another item (not on list refreshes).
  }, [open, itemId, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  async function requestClose() {
    if (isSubmitting || uploadBusy || deleting) return;
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard changes?',
        message: item ? 'You have unsaved changes to this dish.' : 'This dish hasn’t been added yet.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
      });
      if (!discard) return;
    }
    onClose();
  }

  async function onSubmit(values) {
    setFormError('');
    const payload = toPayload(values);
    try {
      const saved = item
        ? await api.patch(`/admin/items/${item._id}`, payload)
        : await api.post('/admin/items', payload);
      if (item) {
        toast.success(`Saved “${payload.name}” — the website shows the change now.`);
      } else if (payload.available) {
        toast.success(`Added “${payload.name}” — it’s live on the website now.`);
      } else {
        toast.success(`Added “${payload.name}” — it’s on the website menu, marked unavailable.`);
      }
      onSaved(saved);
    } catch (err) {
      const leftovers = applyServerErrors(err, setError, FORM_FIELDS);
      toast.error(errorMessage(err));
      if (leftovers.length) setFormError(leftovers.join(' '));
    }
  }

  const busy = isSubmitting || uploadBusy || deleting;

  async function handleDelete() {
    if (!item || busy) return;
    setDeleting(true);
    try {
      await onDelete?.(item);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={requestClose}
      size="lg"
      title={item ? `Edit ${item.name}` : 'Add dish'}
      description={
        item
          ? `ID: ${item.itemId ?? item._id}`
          : 'It goes live on the website menu and ordering page as soon as you add it. The public ID is generated from the name.'
      }
      footer={
        <>
          {item && onDelete && (
            <button type="button" className={cx(BTN_DANGER, 'mr-auto')} onClick={handleDelete} disabled={busy}>
              {deleting ? <Spinner className="size-4" /> : <Trash2 aria-hidden="true" className="size-4" />}
              Delete dish
            </button>
          )}
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={requestClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn-sm btn-primary" disabled={busy}>
            {isSubmitting && <Spinner className="size-4" />}
            {item ? 'Save changes' : 'Add dish'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <FormAlert>{formError}</FormAlert>

        <TextInput label="Name" required error={errors.name?.message} autoComplete="off" data-autofocus {...register('name')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Category"
            required
            error={errors.category?.message}
            hint={!categoriesLoading && categories.length === 0 ? 'Create a category first.' : undefined}
            {...register('category')}
          >
            <option value="">{categoriesLoading ? 'Loading…' : 'Choose a category'}</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c.active === false ? ' (hidden)' : ''}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Price"
            required
            prefix="£"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            error={errors.price?.message}
            {...register('price', {
              onBlur: (e) => {
                const raw = e.target.value.trim();
                if (MONEY_RE.test(raw)) setValue('price', parseMoney(raw).toFixed(2), { shouldValidate: true });
              },
            })}
          />
        </div>

        <TextArea label="Description" optional rows={3} error={errors.description?.message} {...register('description')} />

        <Controller
          control={control}
          name="image"
          render={({ field, fieldState }) => (
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              onBusyChange={setUploadBusy}
              sitePhoto={item?.itemId ? photoFor(item.itemId) : null}
            />
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className="field-label text-ink">Dietary labels</legend>
            <p className="mb-2 text-xs text-muted-dark">Only as labelled by the restaurant.</p>
            <div className="space-y-2">
              {DIETARY_OPTIONS.map((opt) => (
                <Checkbox key={opt.value} label={opt.label} value={opt.value} {...register('dietary')} />
              ))}
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="field-label text-ink">Tags</legend>
            <p className="mb-2 text-xs text-muted-dark">Highlight badges on the menu.</p>
            <div className="space-y-2">
              {TAG_OPTIONS.map((opt) => (
                <Checkbox key={opt.value} label={opt.label} value={opt.value} {...register('tags')} />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Allergens"
            optional
            placeholder="e.g. fish, soy, sesame"
            hint="Comma-separated."
            error={errors.allergens?.message}
            {...register('allergens')}
          />
          <TextInput
            label="Display order"
            optional
            inputMode="numeric"
            placeholder="Auto"
            hint="Lower numbers appear first in the category."
            error={errors.order?.message}
            {...register('order')}
          />
        </div>

        <div className="space-y-4 rounded-xl bg-cream/50 p-4 ring-1 ring-ink/5">
          <Switch
            label="Available to order"
            description="Unavailable dishes stay on the menu, greyed out, and can’t be ordered."
            {...register('available')}
          />
          <Switch label="Hot dish" description="Adds the animated steam effect on the menu." {...register('hot')} />
        </div>
      </form>
    </Drawer>
  );
}
